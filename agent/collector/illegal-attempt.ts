/**
 * agent/collector/illegal-attempt.ts — Demo: proof that the restricted key
 * cannot steal funds (Phase 2 / Judge demo).
 * Owner: Orang 2.
 *
 * The Collector's KEEPER_PRIVATE_KEY is a Function-Call access key with:
 *   receiver_id  = fullback.<master>.testnet  (FULLBACK contract only)
 *   method_names = ["settle_due"]             (this one method only)
 *   allowance    = 2 NEAR                     (no token-transfer privilege)
 *
 * This file tries to call ft_transfer on the fEUR contract using that key.
 * NEAR validators reject the transaction because the key's receiver_id and
 * method_names do not cover ft_transfer on feur.<master>.testnet.
 *
 * Usage: `npm run reader -w agent` will not invoke this; it is only called
 * from the Judge demo route in Phase 2 (web/app/api/demo/illegal-attempt).
 *
 * The function never throws — it always returns a structured result. Only
 * `outcome: "rejected"` (an AccessKey… error from the RPC) is proof that the
 * chain blocked the attempt; network/env failures come back as `outcome:
 * "error"` and must not be shown as a rejection (issue #10). A rejected
 * transaction never enters a block, so there is no tx hash or nearblocks link
 * for that step — the web UI must not wait for one.
 */

import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  JsonRpcProvider,
  teraToGas,
} from "near-api-js";
import type { KeyPairString } from "near-api-js";

export interface IllegalAttemptResult {
  /**
   * "rejected" — the chain refused the transaction with an AccessKey… error
   *              (classes from near-api-js/rpc-errors): the proof the demo
   *              wants.
   * "accepted" — the transaction went through: the keeper key is NOT
   *              restricted. The demo is misconfigured.
   * "error"    — network / RPC / env problem: nothing was proven either way,
   *              never report this as a chain rejection.
   */
  outcome: "rejected" | "accepted" | "error";
  /** True only when outcome is "rejected". */
  rejected_by_chain: boolean;
  /** Raw error message returned by the NEAR RPC (empty when outcome is "accepted"). */
  error: string;
  /** Error class name, e.g. AccessKeyReceiverMismatchActionError. */
  error_kind: string | null;
  /**
   * Nearblocks link, only when a transaction actually ran (outcome
   * "accepted"). For "rejected" this is always null: the tx is refused before
   * it enters a block, so no hash exists — the web UI must not wait for a link
   * on this demo step (issue #10).
   */
  explorer_link: string | null;
  /** Account that attempted the transfer. */
  keeper_account_id: string;
  /** Contract the key tried to call (fEUR, not FULLBACK). */
  attempted_receiver: string;
  /** Method the key tried to call. */
  attempted_method: "ft_transfer";
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing env var: ${name}`);
  }
  return val;
}

const EXPLORER_TX = "https://testnet.nearblocks.io/txns";

/**
 * Classify a caught error from the illegal transfer attempt.
 *
 * Only an access-key rejection (class name starting with "AccessKey", from
 * near-api-js/rpc-errors) proves the restricted key blocked the call — the same
 * rule scripts/run-demo.ts uses. A network error, a wrong RPC URL, or a missing
 * env var proves nothing and must NOT be reported as a chain rejection
 * (issue #10).
 */
export function classifyAttemptError(err: unknown): {
  outcome: "rejected" | "error";
  error: string;
  error_kind: string | null;
} {
  const kind = err instanceof Error ? err.constructor.name : "";
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err);
  return {
    outcome: kind.startsWith("AccessKey") ? "rejected" : "error",
    error: message,
    error_kind: kind === "" ? null : kind,
  };
}

/**
 * Try to transfer 1 fEUR (smallest unit: "1") from the Collector's account
 * to itself using the restricted KEEPER_PRIVATE_KEY.
 *
 * NEAR will reject this because the key may only call `settle_due` on the
 * FULLBACK contract, not `ft_transfer` on the fEUR contract.
 *
 * Returns a structured result; never throws.
 */
export async function tryIllegalTransfer(opts?: {
  /** Override env loading for unit tests. */
  ftId?: string;
  keeperAccountId?: string;
  keeperPrivateKey?: string;
  rpcUrl?: string;
}): Promise<IllegalAttemptResult> {
  const rpcUrl =
    opts?.rpcUrl ??
    (process.env.NEAR_RPC_URL?.trim() || "https://test.rpc.fastnear.com");
  const ftId = opts?.ftId ?? requireEnv("FT_ID");
  const keeperAccountId = opts?.keeperAccountId ?? requireEnv("KEEPER_ACCOUNT_ID");
  const keeperPrivateKey = opts?.keeperPrivateKey ?? requireEnv("KEEPER_PRIVATE_KEY");

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const keeper = new Account(
    keeperAccountId,
    provider,
    keeperPrivateKey as KeyPairString,
  );

  try {
    // Attempt ft_transfer on the fEUR contract.
    // The KEEPER key's receiver_id is the FULLBACK contract and its
    // method_names list contains only "settle_due", so this will be rejected
    // by NEAR validators before any token moves.
    const res = await keeper.callFunctionRaw({
      contractId: ftId,
      methodName: "ft_transfer",
      args: {
        receiver_id: keeperAccountId, // transfer to self — still must be blocked
        amount: "1",
        memo: "illegal collector attempt",
      },
      gas: teraToGas("30"),
      // NO deposit — on purpose (issue #10). ft_transfer wants 1 yoctoNEAR,
      // but a function-call key may never attach one: with a deposit the chain
      // reports AccessKeyDepositWithFunctionCallActionError, without it the
      // clearer AccessKeyReceiverMismatchActionError ("this key is only for
      // the FULLBACK contract") — same as scripts/run-demo.ts.
      deposit: 0n,
      waitUntil: "FINAL",
    });

    // If we somehow reach here the network didn't block it — report as an
    // unexpected success (should never happen in a correctly configured demo).
    return {
      outcome: "accepted",
      rejected_by_chain: false,
      error:
        "Unexpected: transaction was accepted. Check that the key is correctly restricted.",
      error_kind: null,
      explorer_link: `${EXPLORER_TX}/${res.transaction.hash}`,
      keeper_account_id: keeperAccountId,
      attempted_receiver: ftId,
      attempted_method: "ft_transfer",
    };
  } catch (err: unknown) {
    // Only an AccessKey… rejection counts as "the chain blocked it". For that
    // outcome there is never a tx hash: the transaction is refused before it
    // enters a block (issue #10).
    const { outcome, error, error_kind } = classifyAttemptError(err);
    return {
      outcome,
      rejected_by_chain: outcome === "rejected",
      error,
      error_kind,
      explorer_link: null,
      keeper_account_id: keeperAccountId,
      attempted_receiver: ftId,
      attempted_method: "ft_transfer",
    };
  }
}

// ---------------------------------------------------------------------------
// CLI runner (Phase 2 demo / manual test)
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  loadEnv({ path: resolve(ROOT, ".env") });

  console.log("[illegal-attempt] Trying ft_transfer with restricted key…");

  tryIllegalTransfer()
    .then((result) => {
      console.log("\n=== Result ===");
      console.log(JSON.stringify(result, null, 2));
      if (result.explorer_link) {
        console.log(`\nExplorer: ${result.explorer_link}`);
      }
      if (result.outcome === "rejected") {
        console.log(
          "\n✓ Blockchain correctly rejected the transfer attempt.",
        );
        return;
      }
      // Anything else proves nothing — never claim the chain blocked it.
      if (result.outcome === "accepted") {
        console.error(
          "\n✗ The transfer was ACCEPTED — the keeper key is NOT restricted!",
        );
      } else {
        console.error(
          `\n✗ Nothing was proven — ${result.error_kind ?? "unknown error"}: ${result.error}`,
        );
      }
      process.exit(1);
    })
    .catch((err) => {
      console.error("[illegal-attempt] fatal:", err);
      process.exit(1);
    });
}
