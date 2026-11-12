// Shared helpers for the FULLBACK scripts: testnet connection, env, calls, links.

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  JsonRpcProvider,
  getTransactionLastResult,
  teraToGas,
  type KeyPairString,
} from "near-api-js";
import { AccessKeyDoesNotExistError, AccountDoesNotExistError } from "near-api-js/rpc-errors";

export const SCRIPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_DIR = resolve(SCRIPTS_DIR, "..");
export const DEMO_ENV_FILE = resolve(SCRIPTS_DIR, ".env.demo");

// Root .env first, then the file written by setup-demo (which wins for demo accounts).
loadEnv({ path: resolve(REPO_DIR, ".env") });
if (existsSync(DEMO_ENV_FILE)) loadEnv({ path: DEMO_ENV_FILE, override: true });

const network = process.env.NEAR_NETWORK ?? "testnet";
if (network !== "testnet") {
  throw new Error(`NEAR_NETWORK is "${network}". FULLBACK scripts only run on testnet.`);
}

export const RPC_URL = process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com";
export const provider = new JsonRpcProvider({ url: RPC_URL });

export const FEUR_DECIMALS = 6n;
/** Whole fEUR to base units. */
export const fe = (whole: number | bigint) => BigInt(whole) * 10n ** FEUR_DECIMALS;
/** Base units to a readable fEUR amount. */
export const fmt = (units: bigint | string) =>
  (BigInt(units) / 10n ** FEUR_DECIMALS).toLocaleString("en-US") + " fEUR";

export const GAS_CALL = teraToGas("30");
// Each payout costs 14 TGas of static gas; up to 5 academies + seller (+ sell-on holder).
export const GAS_SETTLE = teraToGas("150");
export const GAS_PAY = teraToGas("250");
export const ONE_YOCTO = 1n;

export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Run "npm run setup:demo" or fill it in .env.`);
    process.exit(1);
  }
  return value;
}

export function account(idVar: string, keyVar: string): Account {
  return new Account(env(idVar), provider, env(keyVar) as KeyPairString);
}

export const txLink = (hash: string) => `https://testnet.nearblocks.io/txns/${hash}`;
export const accountLink = (id: string) => `https://testnet.nearblocks.io/address/${id}`;

export interface CallResult<T> {
  hash: string;
  value: T;
}

/** A change call that waits for the full result and returns its value and tx hash. */
export async function call<T = unknown>(
  signer: Account,
  contractId: string,
  methodName: string,
  args: Record<string, unknown>,
  opts: { gas?: bigint; deposit?: bigint } = {},
): Promise<CallResult<T>> {
  const res = await signer.callFunctionRaw({
    contractId,
    methodName,
    args,
    gas: opts.gas ?? GAS_CALL,
    deposit: opts.deposit ?? 0n,
    waitUntil: "FINAL",
  });
  return { hash: res.transaction.hash, value: getTransactionLastResult(res) as T };
}

export async function view<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await provider.callFunction({ contractId, method, args })) as T;
}

/** False only when the chain says the account does not exist; other RPC errors throw. */
export async function accountExists(accountId: string): Promise<boolean> {
  try {
    await provider.viewAccount({ accountId });
    return true;
  } catch (err) {
    if (err instanceof AccountDoesNotExistError) return false;
    throw err;
  }
}

/** True when `accountId` holds `publicKey`; false only when the chain says it does not. */
export async function hasAccessKey(accountId: string, publicKey: string): Promise<boolean> {
  try {
    await provider.viewAccessKey({ accountId, publicKey });
    return true;
  } catch (err) {
    if (err instanceof AccessKeyDoesNotExistError) return false;
    throw err;
  }
}

export async function ftBalance(ftId: string, accountId: string): Promise<bigint> {
  return BigInt(await view<string>(ftId, "ft_balance_of", { account_id: accountId }));
}

/**
 * Pays the FULLBACK contract through fEUR `ft_transfer_call`. Returns the amount
 * the contract kept; anything else was refunded by the token.
 */
export async function payFeur(
  payer: Account,
  ftId: string,
  contractId: string,
  amount: bigint,
  msg: Record<string, unknown>,
): Promise<CallResult<bigint>> {
  const res = await call<string>(
    payer,
    ftId,
    "ft_transfer_call",
    { receiver_id: contractId, amount: amount.toString(), msg: JSON.stringify(msg) },
    { gas: GAS_PAY, deposit: ONE_YOCTO },
  );
  return { hash: res.hash, value: BigInt(res.value) };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
