// npm run demo
//
// Plays the whole demo story on NEAR testnet and prints an explorer link for every
// step: Deal 1 (Porto Alegre FC buys Lucas from Nordvik IF, 4 installments), an
// overdue installment paid from the collateral by the collector agent, the agent's
// refused attempt to move tokens, the top up, the last installments, the collateral
// release, and Deal 2 (Club Z buys Lucas for 20,000,000 fEUR in one payment).
// At the end every party's fEUR balance change is checked against the agreement.
//
// Needs the accounts written by `npm run setup:demo` (scripts/.env.demo or .env).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Account, type KeyPairString } from "near-api-js";
import {
  GAS_SETTLE,
  ONE_YOCTO,
  REPO_DIR,
  account,
  call,
  env,
  fe,
  fmt,
  ftBalance,
  payFeur,
  provider,
  sleep,
  txLink,
  view,
} from "./lib/near.js";

const FT = env("FT_ID");
const CONTRACT = env("CONTRACT_ID");
const owner = account("FT_OWNER_ACCOUNT_ID", "FT_OWNER_PRIVATE_KEY");
const seller = account("DEMO_SELLER_ACCOUNT_ID", "DEMO_SELLER_PRIVATE_KEY");
const buyer = account("DEMO_BUYER_ACCOUNT_ID", "DEMO_BUYER_PRIVATE_KEY");
const resaleBuyer = account("DEMO_RESALE_BUYER_ACCOUNT_ID", "DEMO_RESALE_BUYER_PRIVATE_KEY");
const kota = env("DEMO_ACADEMY_1_ACCOUNT_ID");
const desa = env("DEMO_ACADEMY_2_ACCOUNT_ID");
// The collector signs with its function-call key only.
const keeper = new Account(env("KEEPER_ACCOUNT_ID"), provider, env("KEEPER_PRIVATE_KEY") as KeyPairString);

const INSTALLMENT = fe(2_500_000);
const COLLATERAL = fe(2_500_000);
const RESALE_FEE = fe(20_000_000);

interface DealView {
  deal_id: number;
  status: string;
  needs_top_up: boolean;
  collateral_balance: string;
  next_due_at_ns: string | null;
}

let step = 0;
function log(text: string, hash?: string) {
  step += 1;
  console.log(`${String(step).padStart(2)}. ${text}${hash ? `\n    ${txLink(hash)}` : ""}`);
}

function agreementHash(): string {
  const dir = resolve(REPO_DIR, "sample-agreements");
  const pdf = resolve(dir, "deal1-nordvik-portoalegre.pdf");
  const file = existsSync(pdf) ? pdf : resolve(dir, "deal1-nordvik-portoalegre.md");
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

async function getDeal(id: number): Promise<DealView> {
  return view<DealView>(CONTRACT, "get_deal", { deal_id: id });
}

async function mint(to: Account, amount: bigint) {
  const res = await call(owner, FT, "mint", { account_id: to.accountId, amount: amount.toString() });
  log(`Mint ${fmt(amount)} to ${to.accountId}`, res.hash);
}

async function pay(payer: Account, amount: bigint, action: string, dealId: number, label: string) {
  const res = await payFeur(payer, FT, CONTRACT, amount, { action, deal_id: dealId });
  if (res.value !== amount) throw new Error(`${label}: contract kept ${fmt(res.value)}, expected ${fmt(amount)}`);
  log(label, res.hash);
}

/** Waits until the next installment is due, then lets the collector settle it. */
async function waitAndSettle(dealId: number) {
  const deal = await getDeal(dealId);
  const dueMs = Number(BigInt(deal.next_due_at_ns!) / 1_000_000n);
  const waitMs = dueMs - Date.now() + 3_000;
  if (waitMs > 0) {
    console.log(`    waiting ${Math.ceil(waitMs / 1000)} s for installment 2 to fall due...`);
    await sleep(waitMs);
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await call<{ result: string; installment_index: number }>(keeper, CONTRACT, "settle_due", { deal_id: dealId }, { gas: GAS_SETTLE });
    if (res.value.result === "PaidFromCollateral") {
      log(`Collector agent: settle_due paid installment ${res.value.installment_index + 1} from the collateral`, res.hash);
      return;
    }
    if (res.value.result !== "NotDue") throw new Error(`settle_due returned ${res.value.result}`);
    await sleep(5_000); // block time can trail the local clock
  }
  throw new Error("Installment never became due");
}

async function illegalAttempt() {
  try {
    await keeper.callFunctionRaw({
      contractId: FT,
      methodName: "ft_transfer",
      args: { receiver_id: keeper.accountId, amount: "1" },
      deposit: ONE_YOCTO,
      gas: GAS_SETTLE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Collector agent tried ft_transfer on fEUR and the chain refused it:\n    ${message.split("\n")[0]}`);
    return;
  }
  throw new Error("The collector key was able to call ft_transfer. Its key must be limited to settle_due.");
}

async function main() {
  const parties = { [seller.accountId]: "Nordvik IF", [kota]: "Kota FC", [desa]: "Akademi Desa", [buyer.accountId]: "Porto Alegre FC", [resaleBuyer.accountId]: "Club Z", [CONTRACT]: "FULLBACK contract" };
  const before: Record<string, bigint> = {};
  for (const id of Object.keys(parties)) before[id] = await ftBalance(FT, id);

  const playerId = `lucas-${Date.now()}`;
  console.log(`FULLBACK story on testnet, player ${playerId}\n`);

  await mint(buyer, COLLATERAL * 2n + INSTALLMENT * 3n);

  const created = await call<number>(buyer, CONTRACT, "create_deal", {
    player_id: playerId,
    player_name: "Lucas",
    seller_id: seller.accountId,
    price: fe(10_000_000).toString(),
    installments: [1, 2, 3, 4].map((i) => ({ amount: INSTALLMENT.toString(), due_offset_sec: 120 * i })),
    collateral: COLLATERAL.toString(),
    sell_on_bps: 1500,
    sell_on_basis: "gross",
    training_clubs: [
      { account_id: kota, name: "Kota FC", bps: 400 },
      { account_id: desa, name: "Akademi Desa", bps: 100 },
    ],
    pdf_hash: agreementHash(),
  });
  const dealId = created.value;
  log(`Porto Alegre FC creates Deal ${dealId} (10,000,000 fEUR, 4 installments, PDF fingerprint stored)`, created.hash);

  const approved = await call(seller, CONTRACT, "approve_deal", { deal_id: dealId });
  log("Nordvik IF approves the deal", approved.hash);

  await pay(buyer, COLLATERAL, "deposit_collateral", dealId, "Porto Alegre FC deposits 2,500,000 fEUR collateral, deal is Active");
  await pay(buyer, INSTALLMENT, "pay_installment", dealId, "Porto Alegre FC pays installment 1");

  await waitAndSettle(dealId);
  const afterSettle = await getDeal(dealId);
  console.log(`    collateral now ${fmt(afterSettle.collateral_balance)}, buyer must top up: ${afterSettle.needs_top_up}`);

  await illegalAttempt();

  await pay(buyer, COLLATERAL, "top_up_collateral", dealId, "Porto Alegre FC tops the collateral back up to 2,500,000 fEUR");
  await pay(buyer, INSTALLMENT, "pay_installment", dealId, "Porto Alegre FC pays installment 3");
  await pay(buyer, INSTALLMENT, "pay_installment", dealId, "Porto Alegre FC pays installment 4, deal Completed");

  const released = await call(buyer, CONTRACT, "release_collateral", { deal_id: dealId }, { gas: GAS_SETTLE });
  log("Porto Alegre FC withdraws its collateral", released.hash);

  const resale = await call<number>(buyer, CONTRACT, "record_resale", {
    player_id: playerId,
    new_buyer_id: resaleBuyer.accountId,
    fee: RESALE_FEE.toString(),
  });
  log(`Porto Alegre FC records the resale to Club Z as Deal ${resale.value}`, resale.hash);

  await mint(resaleBuyer, RESALE_FEE);
  await pay(resaleBuyer, RESALE_FEE, "pay_resale", resale.value, "Club Z pays 20,000,000 fEUR, split in one transaction");

  // Payouts run in receipts after the paying transaction; give them a moment.
  await sleep(3_000);

  // Net change per party, not counting the test tokens minted above.
  const expected: Record<string, bigint> = {
    [seller.accountId]: fe(9_500_000) + fe(3_000_000), // installments + sell-on
    [kota]: fe(400_000) + fe(800_000),
    [desa]: fe(100_000) + fe(200_000),
    // paid 12,500,000 (collateral twice + 4 installments - 2 from collateral), got
    // 2,500,000 collateral back and 16,000,000 from the resale
    [buyer.accountId]: -fe(12_500_000) + fe(2_500_000) + fe(16_000_000),
    [resaleBuyer.accountId]: -RESALE_FEE,
    [CONTRACT]: 0n,
  };
  const minted: Record<string, bigint> = {
    [buyer.accountId]: COLLATERAL * 2n + INSTALLMENT * 3n,
    [resaleBuyer.accountId]: RESALE_FEE,
  };

  console.log("\nBalance changes (minted test tokens excluded)");
  let ok = true;
  for (const [id, name] of Object.entries(parties)) {
    const delta = (await ftBalance(FT, id)) - before[id] - (minted[id] ?? 0n);
    const want = expected[id];
    const pass = delta === want;
    ok &&= pass;
    console.log(`  ${pass ? "OK  " : "FAIL"} ${name.padEnd(18)} ${delta >= 0n ? "+" : ""}${fmt(delta)}  (expected ${want >= 0n ? "+" : ""}${fmt(want)})`);
  }
  for (const id of Object.keys(parties)) {
    const pending = BigInt(await view<string>(CONTRACT, "get_pending", { account_id: id }));
    if (pending > 0n) {
      ok = false;
      console.log(`  FAIL ${parties[id]} has ${fmt(pending)} pending`);
    }
  }
  if (!ok) throw new Error("Balances do not match the agreement");
  console.log("\nAll balances match the agreement.");
}

main().catch((err) => {
  console.error(`\nDemo failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
