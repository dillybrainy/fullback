/**
 * agent/collector/index.ts — FULLBACK Collector Agent (U5)
 * Owner: Orang 2.
 *
 * Reads list_deals every TICK_INTERVAL_MS (default 15 s), finds Active deals
 * where next_due_at_ns has passed, and calls settle_due for each.
 *
 * Uses KEEPER_PRIVATE_KEY — a restricted Function-Call access key that can
 * ONLY call `settle_due` on the FULLBACK contract.  It cannot transfer tokens
 * or send NEAR, so a rogue collector cannot steal anything (see also
 * illegal-attempt.ts for a live proof).
 *
 * Key constraints from INTERFACE.md / PLAN.md R13:
 *  - 2 NEAR allowance ≈ 130 settle_due calls (each ~0.015 NEAR at 150 TGas)
 *  - Even NotDue results spend allowance — ALWAYS read view first
 *  - Only call settle_due once next_due_at_ns has passed
 */

import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  JsonRpcProvider,
  getTransactionLastResult,
  teraToGas,
} from "near-api-js";
import type { KeyPairString } from "near-api-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DealView {
  deal_id: number;
  status:
    | "Proposed"
    | "Approved"
    | "Active"
    | "Defaulted"
    | "Completed"
    | "Resold";
  /** Nanoseconds since epoch as a decimal string; null before deal is Active or when all paid. */
  next_due_at_ns: string | null;
}

export interface SettleResult {
  result: "NotActive" | "NotDue" | "PaidFromCollateral" | "Defaulted";
  installment_index: number | null;
}

export interface TickEntry {
  deal_id: number;
  result: "NotActive" | "NotDue" | "PaidFromCollateral" | "Defaulted";
  installment_index: number | null;
  tx_hash: string;
  explorer_link: string;
}

/**
 * Injectable NEAR operations so unit tests can mock them without network calls.
 * Production code uses `createLiveDeps()`.
 */
export interface CollectorDeps {
  /** View call — free, never costs allowance. */
  listDeals(from_index?: number, limit?: number): Promise<DealView[]>;
  /** Change call — costs ~0.015 NEAR allowance; only call when actually overdue. */
  settleDue(deal_id: number): Promise<{ hash: string; value: SettleResult }>;
  /** Current wall-clock time in nanoseconds (BigInt). Injected so tests can fix time. */
  nowNs(): bigint;
}

// ---------------------------------------------------------------------------
// Core logic (pure tick — no NEAR I/O imports here)
// ---------------------------------------------------------------------------

/** NEAR testnet transaction explorer base URL. */
export const EXPLORER_BASE = "https://testnet.nearblocks.io/txns";

/**
 * One collector tick:
 *  1. Load all deals via view (free — no gas).
 *  2. Skip deals that are not Active or not yet overdue.
 *  3. Call settle_due for each overdue deal.
 *
 * Pages through deals in batches of 100 (the INTERFACE.md max per call).
 * Returns one TickEntry per settle_due call made.
 */
export async function tick(deps: CollectorDeps): Promise<TickEntry[]> {
  const now = deps.nowNs();
  const results: TickEntry[] = [];

  let from = 0;
  const limit = 100;

  while (true) {
    const batch = await deps.listDeals(from, limit);

    for (const deal of batch) {
      // Only Active deals can have an overdue installment.
      if (deal.status !== "Active") continue;
      // next_due_at_ns is null when all installments are paid.
      if (deal.next_due_at_ns === null) continue;
      // Skip if the due time is still in the future.
      if (BigInt(deal.next_due_at_ns) > now) continue;

      const { hash, value } = await deps.settleDue(deal.deal_id);
      results.push({
        deal_id: deal.deal_id,
        result: value.result,
        installment_index: value.installment_index,
        tx_hash: hash,
        explorer_link: `${EXPLORER_BASE}/${hash}`,
      });
    }

    // Stop paging when the batch is smaller than the requested limit.
    if (batch.length < limit) break;
    from += limit;
  }

  return results;
}

// ---------------------------------------------------------------------------
// NEAR-backed deps (live / production)
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required env var: ${name}. Run "npm run setup:demo" or fill it in .env.`,
    );
  }
  return val;
}

/** Build a live CollectorDeps that talks to NEAR testnet. */
export function createLiveDeps(): CollectorDeps {
  const rpcUrl =
    process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com";
  const contractId = requireEnv("CONTRACT_ID");
  const keeperAccountId = requireEnv("KEEPER_ACCOUNT_ID");
  const keeperPrivateKey = requireEnv("KEEPER_PRIVATE_KEY");

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const keeper = new Account(
    keeperAccountId,
    provider,
    keeperPrivateKey as KeyPairString,
  );

  return {
    async listDeals(from_index = 0, limit = 100) {
      return (await provider.callFunction({
        contractId,
        method: "list_deals",
        args: { from_index, limit },
      })) as DealView[];
    },

    async settleDue(deal_id: number) {
      const res = await keeper.callFunctionRaw({
        contractId,
        methodName: "settle_due",
        args: { deal_id },
        gas: teraToGas("150"),
        deposit: 0n,
        waitUntil: "FINAL",
      });
      return {
        hash: res.transaction.hash,
        value: getTransactionLastResult(res) as SettleResult,
      };
    },

    nowNs() {
      return BigInt(Date.now()) * 1_000_000n;
    },
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 15_000;

async function run() {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  loadEnv({ path: resolve(ROOT, ".env") });

  const network = process.env.NEAR_NETWORK ?? "testnet";
  if (network !== "testnet") {
    throw new Error(
      `NEAR_NETWORK is "${network}". Collector only runs on testnet.`,
    );
  }

  console.log("[collector] Starting FULLBACK Collector — NEAR testnet");
  console.log(`[collector] Polling every ${TICK_INTERVAL_MS / 1000}s`);
  console.log(`[collector] Press Ctrl+C to stop`);

  const deps = createLiveDeps();

  while (true) {
    try {
      const entries = await tick(deps);
      if (entries.length === 0) {
        console.log(
          `[collector] ${new Date().toISOString()} — no overdue installments`,
        );
      } else {
        for (const e of entries) {
          const idx =
            e.installment_index !== null
              ? ` (installment #${e.installment_index})`
              : "";
          console.log(
            `[collector] deal #${e.deal_id} → ${e.result}${idx} | ${e.explorer_link}`,
          );
        }
      }
    } catch (err) {
      console.error("[collector] tick error:", err);
    }
    await new Promise((r) => setTimeout(r, TICK_INTERVAL_MS));
  }
}

// Guard: only run when executed directly (not when imported by tests or web).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error("[collector] fatal:", err);
    process.exit(1);
  });
}
