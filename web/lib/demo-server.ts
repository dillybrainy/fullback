// Judge demo mode (PLAN.md R18, KTD13): the server signs every story step with the
// testnet demo accounts from the environment, so a judge needs no wallet.
// Server-only. Amounts, recipients and methods are fixed here (the Lucas story,
// PLAN.md R1–R4); a request can only pick which step runs on which demo deal.
import "server-only";
import { Account, JsonRpcProvider, getTransactionLastResult, teraToGas, type KeyPairString } from "near-api-js";

const RPC_URL = process.env.NEAR_RPC_URL?.trim() || "https://test.rpc.fastnear.com";
const DECIMALS = BigInt(10) ** BigInt(6);
const fe = (whole: number) => BigInt(whole) * DECIMALS;

const INSTALLMENT = fe(2_500_000);
const COLLATERAL = fe(2_500_000);
const PRICE = fe(10_000_000);
const RESALE_FEE = fe(20_000_000);
/** SHA-256 of deal1-nordvik-portoalegre.pdf (committed bytes, git f741c98). */
export const DEAL1_PDF_SHA256 = "eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832";
/** Seconds after activation when installment i (1-based) falls due. */
export const INSTALLMENT_INTERVAL_SEC = 120;

const GAS_CALL = teraToGas("30");
const GAS_SETTLE = teraToGas("150");
const GAS_PAY = teraToGas("250");

export class DemoNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Judge demo mode is not configured on this deployment (missing ${missing.join(", ")}).`);
  }
}

const REQUIRED = [
  "CONTRACT_ID", "FT_ID",
  "FT_OWNER_ACCOUNT_ID", "FT_OWNER_PRIVATE_KEY",
  "DEMO_SELLER_ACCOUNT_ID", "DEMO_SELLER_PRIVATE_KEY",
  "DEMO_BUYER_ACCOUNT_ID", "DEMO_BUYER_PRIVATE_KEY",
  "DEMO_RESALE_BUYER_ACCOUNT_ID", "DEMO_RESALE_BUYER_PRIVATE_KEY",
  "DEMO_ACADEMY_1_ACCOUNT_ID", "DEMO_ACADEMY_2_ACCOUNT_ID",
  "KEEPER_ACCOUNT_ID", "KEEPER_PRIVATE_KEY",
] as const;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

interface Demo {
  provider: JsonRpcProvider;
  contract: string;
  ft: string;
  owner: Account;
  seller: Account;
  buyer: Account;
  resaleBuyer: Account;
  keeper: Account;
  kota: string;
  desa: string;
}

let cached: Demo | null = null;

export function demo(): Demo {
  if (cached) return cached;
  if ((process.env.NEAR_NETWORK?.trim() || "testnet") !== "testnet") {
    throw new DemoNotConfiguredError(["NEAR_NETWORK=testnet (only testnet is allowed)"]);
  }
  const missing = REQUIRED.filter((name) => !env(name));
  if (missing.length) throw new DemoNotConfiguredError(missing);
  const provider = new JsonRpcProvider({ url: RPC_URL });
  const account = (id: string, key: string) => new Account(env(id), provider, env(key) as KeyPairString);
  cached = {
    provider,
    contract: env("CONTRACT_ID"),
    ft: env("FT_ID"),
    owner: account("FT_OWNER_ACCOUNT_ID", "FT_OWNER_PRIVATE_KEY"),
    seller: account("DEMO_SELLER_ACCOUNT_ID", "DEMO_SELLER_PRIVATE_KEY"),
    buyer: account("DEMO_BUYER_ACCOUNT_ID", "DEMO_BUYER_PRIVATE_KEY"),
    resaleBuyer: account("DEMO_RESALE_BUYER_ACCOUNT_ID", "DEMO_RESALE_BUYER_PRIVATE_KEY"),
    // The collector signs with its function-call key only (settle_due on FULLBACK).
    keeper: account("KEEPER_ACCOUNT_ID", "KEEPER_PRIVATE_KEY"),
    kota: env("DEMO_ACADEMY_1_ACCOUNT_ID"),
    desa: env("DEMO_ACADEMY_2_ACCOUNT_ID"),
  };
  return cached;
}

export interface Step {
  label: string;
  /** Transaction hash, or null when the chain refused the transaction before a block. */
  hash: string | null;
}

export interface DealView {
  deal_id: number;
  kind: "Primary" | "Resale";
  parent_deal_id: number | null;
  player_id: string;
  player_name: string;
  seller_id: string;
  buyer_id: string;
  price: string;
  installments: { amount: string; due_at_ns: string | null; paid: boolean; paid_from_collateral: boolean }[];
  installments_paid: number;
  next_due_index: number | null;
  next_due_at_ns: string | null;
  collateral_required: string;
  collateral_balance: string;
  needs_top_up: boolean;
  status: string;
  total_paid: string;
  training_paid: string;
  pdf_hash: string;
}

async function call<T = unknown>(signer: Account, contractId: string, methodName: string, args: Record<string, unknown>, opts: { gas?: bigint; deposit?: bigint } = {}) {
  const res = await signer.callFunctionRaw({ contractId, methodName, args, gas: opts.gas ?? GAS_CALL, deposit: opts.deposit ?? BigInt(0), waitUntil: "FINAL" });
  return { hash: res.transaction.hash as string, value: getTransactionLastResult(res) as T };
}

async function view<T>(contractId: string, method: string, args: Record<string, unknown> = {}) {
  return (await demo().provider.callFunction({ contractId, method, args })) as T;
}

async function pay(payer: Account, amount: bigint, action: string, dealId: number) {
  const d = demo();
  const res = await call<string>(payer, d.ft, "ft_transfer_call",
    { receiver_id: d.contract, amount: amount.toString(), msg: JSON.stringify({ action, deal_id: dealId }) },
    { gas: GAS_PAY, deposit: BigInt(1) });
  if (BigInt(res.value) !== amount) throw new Error(`The contract refused the payment (${action}); the tokens were refunded.`);
  return res.hash;
}

export function getDeal(dealId: number) {
  return view<DealView | null>(demo().contract, "get_deal", { deal_id: dealId });
}

/** Only deals this demo created (Lucas, demo buyer) may be driven by the demo routes. */
async function demoDeal(dealId: number): Promise<DealView> {
  const d = demo();
  const deal = await getDeal(dealId);
  if (!deal || deal.player_name !== "Lucas" || ![d.buyer.accountId, d.resaleBuyer.accountId].includes(deal.buyer_id)) {
    throw new Error("This is not a judge demo deal.");
  }
  return deal;
}

export const PARTIES = () => {
  const d = demo();
  return [
    { id: d.seller.accountId, name: "Nordvik IF", role: "Seller" },
    { id: d.buyer.accountId, name: "Porto Alegre FC", role: "Buyer, then reseller" },
    { id: d.kota, name: "Kota FC", role: "Academy" },
    { id: d.desa, name: "Akademi Desa", role: "Academy" },
    { id: d.resaleBuyer.accountId, name: "Club Z", role: "Resale buyer" },
  ];
};

export async function balances(): Promise<Record<string, string>> {
  const d = demo();
  const out: Record<string, string> = {};
  await Promise.all(PARTIES().map(async (p) => { out[p.id] = await view<string>(d.ft, "ft_balance_of", { account_id: p.id }); }));
  return out;
}

export type DemoAction = "create" | "approve" | "deposit" | "pay" | "topup" | "rogue" | "release" | "resale";

export async function runAction(action: DemoAction, dealId?: number): Promise<{ steps: Step[]; dealId: number; resaleDealId?: number }> {
  const d = demo();
  if (action === "create") {
    const minted = await call(d.owner, d.ft, "mint", { account_id: d.buyer.accountId, amount: (COLLATERAL * BigInt(2) + INSTALLMENT * BigInt(3)).toString() });
    const created = await call<number>(d.buyer, d.contract, "create_deal", {
      player_id: `lucas-${Date.now()}`,
      player_name: "Lucas",
      seller_id: d.seller.accountId,
      price: PRICE.toString(),
      installments: [1, 2, 3, 4].map((i) => ({ amount: INSTALLMENT.toString(), due_offset_sec: INSTALLMENT_INTERVAL_SEC * i })),
      collateral: COLLATERAL.toString(),
      sell_on_bps: 1500,
      sell_on_basis: "gross",
      training_clubs: [
        { account_id: d.kota, name: "Kota FC", bps: 400 },
        { account_id: d.desa, name: "Akademi Desa", bps: 100 },
      ],
      pdf_hash: DEAL1_PDF_SHA256,
    });
    return {
      dealId: created.value,
      steps: [
        { label: "Test fEUR minted to Porto Alegre FC for this demo run (12,500,000 fEUR)", hash: minted.hash },
        { label: `Porto Alegre FC proposes Deal ${created.value}: 10,000,000 fEUR in 4 installments, PDF fingerprint stored`, hash: created.hash },
      ],
    };
  }
  if (dealId === undefined || !Number.isSafeInteger(dealId) || dealId < 0) throw new Error("Choose a demo deal first.");
  const deal = await demoDeal(dealId);
  switch (action) {
    case "approve": {
      const res = await call(d.seller, d.contract, "approve_deal", { deal_id: dealId });
      return { dealId, steps: [{ label: "Nordvik IF approves the deal", hash: res.hash }] };
    }
    case "deposit": {
      const hash = await pay(d.buyer, COLLATERAL, "deposit_collateral", dealId);
      return { dealId, steps: [{ label: "Porto Alegre FC deposits 2,500,000 fEUR collateral; the deal is Active and the payment clock starts", hash }] };
    }
    case "pay": {
      const n = deal.installments_paid + 1;
      const hash = await pay(d.buyer, INSTALLMENT, "pay_installment", dealId);
      return { dealId, steps: [{ label: `Porto Alegre FC pays installment ${n} (2,500,000 fEUR), split between Nordvik IF and the academies`, hash }] };
    }
    case "topup": {
      const missing = BigInt(deal.collateral_required) - BigInt(deal.collateral_balance);
      if (missing <= BigInt(0)) throw new Error("The collateral is already full.");
      const hash = await pay(d.buyer, missing, "top_up_collateral", dealId);
      return { dealId, steps: [{ label: "Porto Alegre FC tops the collateral back up to 2,500,000 fEUR", hash }] };
    }
    case "rogue":
      return { dealId, steps: [await rogueAttempt()] };
    case "release": {
      const res = await call(d.buyer, d.contract, "release_collateral", { deal_id: dealId }, { gas: GAS_SETTLE });
      return { dealId, steps: [{ label: "Porto Alegre FC withdraws its collateral after the last installment", hash: res.hash }] };
    }
    case "resale": {
      const resale = await call<number>(d.buyer, d.contract, "record_resale", { player_id: deal.player_id, new_buyer_id: d.resaleBuyer.accountId, fee: RESALE_FEE.toString() });
      const minted = await call(d.owner, d.ft, "mint", { account_id: d.resaleBuyer.accountId, amount: RESALE_FEE.toString() });
      const hash = await pay(d.resaleBuyer, RESALE_FEE, "pay_resale", resale.value);
      return {
        dealId,
        resaleDealId: resale.value,
        steps: [
          { label: `Porto Alegre FC records the resale to Club Z as Deal ${resale.value} (20,000,000 fEUR)`, hash: resale.hash },
          { label: "Test fEUR minted to Club Z for this demo run (20,000,000 fEUR)", hash: minted.hash },
          { label: "Club Z pays 20,000,000 fEUR: sell-on to Nordvik IF, Academy royalties, rest to Porto Alegre FC, in one transaction", hash },
        ],
      };
    }
  }
  throw new Error("Unknown demo step.");
}

/** The collector agent tries to move tokens with its restricted key; the chain must refuse. */
async function rogueAttempt(): Promise<Step> {
  const d = demo();
  try {
    await d.keeper.callFunctionRaw({ contractId: d.ft, methodName: "ft_transfer", args: { receiver_id: d.keeper.accountId, amount: "1" }, gas: GAS_SETTLE });
  } catch (err) {
    // Only an access-key rejection proves the point; a network error proves nothing.
    // Check the message too: class names can be minified in a production bundle.
    const kind = err instanceof Error ? err.constructor.name : "";
    const reason = err instanceof Error ? err.message.split("\n")[0] : "";
    const accessKeyError = kind.startsWith("AccessKey") || /access key|does not match transaction receiver|method name .* not allowed/i.test(reason);
    if (!accessKeyError) throw err;
    return { label: `Refused by the blockchain: the collector's key may only call settle_due on FULLBACK (${reason})`, hash: null };
  }
  throw new Error("The collector key was able to call ft_transfer. Its key must be limited to settle_due.");
}

/**
 * Collector tick for one deal (PLAN.md KTD7): call settle_due with the restricted
 * key only after the next installment is due. Returns the contract's result.
 */
export async function collectorTick(dealId: number): Promise<{ result: string; step?: Step }> {
  const d = demo();
  const deal = await demoDeal(dealId);
  if (deal.status !== "Active" || !deal.next_due_at_ns) return { result: "NothingDue" };
  if (BigInt(deal.next_due_at_ns) > BigInt(Date.now()) * BigInt(1000000)) return { result: "NotDue" };
  const res = await call<{ result: string; installment_index: number }>(d.keeper, d.contract, "settle_due", { deal_id: dealId }, { gas: GAS_SETTLE });
  const n = (res.value.installment_index ?? 0) + 1;
  const labels: Record<string, string> = {
    PaidFromCollateral: `Collector agent: installment ${n} was late, settle_due paid it from the collateral`,
    Defaulted: "Collector agent: the collateral could not cover a late installment, the deal is Defaulted",
  };
  return { result: res.value.result, step: labels[res.value.result] ? { label: labels[res.value.result], hash: res.hash } : undefined };
}
