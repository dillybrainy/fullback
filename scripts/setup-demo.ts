// npm run setup:demo
//
// Creates the FULLBACK demo world on NEAR testnet from one funded master account:
// sub-accounts for fEUR, the FULLBACK contract, the clubs, the academies and the
// collector agent; deploys both contracts; registers fEUR storage for everyone; and
// gives the collector a function-call key that may only call `settle_due`.
//
// Needs MASTER_ACCOUNT_ID and MASTER_PRIVATE_KEY in .env (a testnet account with
// about 15 NEAR, e.g. from https://near-faucet.io). Every account and key it creates
// is written to scripts/.env.demo (gitignored) right after it is created, so a
// second run continues where the first one stopped.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Account, KeyPair, actions, nearToYocto, teraToGas, type KeyPairString } from "near-api-js";
import {
  DEMO_ENV_FILE,
  REPO_DIR,
  accountExists,
  accountLink,
  call,
  hasAccessKey,
  env,
  provider,
  txLink,
  view,
} from "./lib/near.js";

interface Role {
  prefix: string;
  label: string;
  idVar: string;
  keyVar: string;
  near: `${number}`;
}

// The prefixes become <prefix>.<master>. The NEAR amounts cover contract storage and
// gas for the demo accounts. The FULLBACK contract pays storage for every deal and its
// events (no deposit is asked from callers): about 2.6 NEAR is locked by the 254 KB
// wasm, and the rest pays for roughly 100 demo deals. Top it up if it runs low.
const ROLES: Role[] = [
  { prefix: "feur", label: "fEUR token (owner mints)", idVar: "FT_ID", keyVar: "FT_OWNER_PRIVATE_KEY", near: "2.5" },
  { prefix: "fullback", label: "FULLBACK contract", idVar: "CONTRACT_ID", keyVar: "CONTRACT_PRIVATE_KEY", near: "7" },
  { prefix: "nordvik", label: "Selling club (Nordvik IF)", idVar: "DEMO_SELLER_ACCOUNT_ID", keyVar: "DEMO_SELLER_PRIVATE_KEY", near: "0.5" },
  { prefix: "portoalegre", label: "Buying club (Porto Alegre FC)", idVar: "DEMO_BUYER_ACCOUNT_ID", keyVar: "DEMO_BUYER_PRIVATE_KEY", near: "1" },
  { prefix: "clubz", label: "Resale buyer (Club Z)", idVar: "DEMO_RESALE_BUYER_ACCOUNT_ID", keyVar: "DEMO_RESALE_BUYER_PRIVATE_KEY", near: "0.5" },
  { prefix: "kotafc", label: "Academy, age 16-23 (Kota FC)", idVar: "DEMO_ACADEMY_1_ACCOUNT_ID", keyVar: "DEMO_ACADEMY_1_PRIVATE_KEY", near: "0.2" },
  { prefix: "akademidesa", label: "Academy, age 12-15 (Akademi Desa)", idVar: "DEMO_ACADEMY_2_ACCOUNT_ID", keyVar: "DEMO_ACADEMY_2_PRIVATE_KEY", near: "0.2" },
  { prefix: "keeper", label: "Collector agent", idVar: "KEEPER_ACCOUNT_ID", keyVar: "KEEPER_FULL_ACCESS_PRIVATE_KEY", near: "2" },
];

// Every settle_due sent with this key spends allowance (about 0.015 NEAR at 150 TGas),
// even when it returns NotDue. 2 NEAR is about 130 calls, so the collector must read
// get_deal (free) and only send settle_due once next_due_at_ns has passed.
const KEEPER_ALLOWANCE = nearToYocto("2");

const demoEnv = new Map<string, string>();

function loadDemoEnv() {
  if (!existsSync(DEMO_ENV_FILE)) return;
  for (const line of readFileSync(DEMO_ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) demoEnv.set(m[1], m[2]);
  }
}

function saveDemoEnv() {
  const lines = [
    "# Written by `npm run setup:demo`. Contains private keys: never commit this file.",
    "# Copy these lines into the root .env (and the Vercel environment) to use them.",
    "NEAR_NETWORK=testnet",
    ...[...demoEnv].map(([k, v]) => `${k}=${v}`),
  ];
  writeFileSync(DEMO_ENV_FILE, lines.join("\n") + "\n");
}

function set(name: string, value: string) {
  demoEnv.set(name, value);
  saveDemoEnv();
}

async function ensureAccount(master: Account, role: Role): Promise<Account> {
  const accountId = `${role.prefix}.${master.accountId}`;
  const knownKey = demoEnv.get(role.keyVar);
  if (await accountExists(accountId)) {
    if (!knownKey) {
      throw new Error(`${accountId} already exists but its key is not in scripts/.env.demo. Delete it or use another master account.`);
    }
    console.log(`  = ${role.label}: ${accountId}`);
    return new Account(accountId, provider, knownKey as KeyPairString);
  }
  // Reuse a key saved by an earlier run whose create failed; otherwise make one and
  // save it before the account exists, so it is never lost or overwritten.
  const keyPair = knownKey ? KeyPair.fromString(knownKey as KeyPairString) : KeyPair.fromRandom("ed25519");
  set(role.idVar, accountId);
  set(role.keyVar, keyPair.toString());
  const res = await master.createSubAccount({
    accountOrPrefix: role.prefix,
    publicKey: keyPair.getPublicKey(),
    nearToTransfer: nearToYocto(role.near),
  });
  console.log(`  + ${role.label}: ${accountId}  ${txLink(res.transaction.hash)}`);
  return new Account(accountId, provider, keyPair.toString());
}

async function isInitialized(contractId: string, viewMethod: string): Promise<boolean> {
  try {
    await view(contractId, viewMethod);
    return true;
  } catch {
    return false;
  }
}

async function deployAndInit(owner: Account, wasmFile: string, initArgs: object, viewMethod: string) {
  if (await isInitialized(owner.accountId, viewMethod)) {
    console.log(`  = ${owner.accountId} already deployed`);
    return;
  }
  const code = readFileSync(resolve(REPO_DIR, "contract", "res", wasmFile));
  const res = await owner.signAndSendTransaction({
    receiverId: owner.accountId,
    actions: [actions.deployContract(code), actions.functionCall("new", initArgs, teraToGas("30"), 0n)],
    waitUntil: "FINAL",
  });
  console.log(`  + ${wasmFile} -> ${owner.accountId}  ${txLink(res.transaction.hash)}`);
}

async function main() {
  loadDemoEnv();
  const master = new Account(env("MASTER_ACCOUNT_ID"), provider, env("MASTER_PRIVATE_KEY") as KeyPairString);
  console.log(`Master account: ${master.accountId}\n\n1. Accounts`);

  const accounts = new Map<string, Account>();
  for (const role of ROLES) accounts.set(role.prefix, await ensureAccount(master, role));
  const feur = accounts.get("feur")!;
  const fullback = accounts.get("fullback")!;
  const keeper = accounts.get("keeper")!;
  set("FT_OWNER_ACCOUNT_ID", feur.accountId);

  console.log("\n2. Contracts");
  await deployAndInit(feur, "feur.wasm", { owner_id: feur.accountId }, "ft_metadata");
  await deployAndInit(fullback, "fullback.wasm", { ft_id: feur.accountId }, "get_config");

  console.log("\n3. fEUR storage registration");
  const bounds = await view<{ min: string }>(feur.accountId, "storage_balance_bounds");
  for (const prefix of ["fullback", "nordvik", "portoalegre", "clubz", "kotafc", "akademidesa"]) {
    const id = accounts.get(prefix)!.accountId;
    const existing = await view<unknown>(feur.accountId, "storage_balance_of", { account_id: id });
    if (existing) {
      console.log(`  = ${id}`);
      continue;
    }
    const res = await call(master, feur.accountId, "storage_deposit", { account_id: id, registration_only: true }, { deposit: BigInt(bounds.min) });
    console.log(`  + ${id}  ${txLink(res.hash)}`);
  }

  console.log("\n4. Collector key (may only call settle_due on FULLBACK)");
  const savedLimited = demoEnv.get("KEEPER_PRIVATE_KEY");
  const limited = savedLimited ? KeyPair.fromString(savedLimited as KeyPairString) : KeyPair.fromRandom("ed25519");
  set("KEEPER_PRIVATE_KEY", limited.toString());
  // Decide from the chain, not the file: an earlier run may have saved the key and failed to add it.
  if (await hasAccessKey(keeper.accountId, limited.getPublicKey().toString())) {
    console.log("  = already added");
  } else {
    const res = await keeper.addFunctionCallAccessKey({
      publicKey: limited.getPublicKey(),
      contractId: fullback.accountId,
      methodNames: ["settle_due"],
      allowance: KEEPER_ALLOWANCE,
    });
    console.log(`  + ${limited.getPublicKey().toString()}  ${txLink(res.transaction.hash)}`);
  }

  console.log(`\nDone. Keys are in ${DEMO_ENV_FILE}`);
  console.log("Copy its lines into the root .env, then run `npm run demo`.");
  console.log(`FULLBACK: ${accountLink(fullback.accountId)}`);
  console.log(`fEUR:     ${accountLink(feur.accountId)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
