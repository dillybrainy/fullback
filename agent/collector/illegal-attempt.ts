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
 * The function never throws — it always returns a structured result so the
 * UI can display the raw blockchain error message and the nearblocks link.
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
  /** Always false: the blockchain rejected the transfer. */
  success: false;
  /** Raw error message returned by the NEAR RPC. */
  error: string;
  /**
   * Nearblocks link for the rejected transaction, if the RPC returned a tx
   * hash before rejecting (some NEAR rejection modes include one).
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
    opts?.rpcUrl ?? process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com";
  const ftId = opts?.ftId ?? requireEnv("FT_ID");
  const keeperAccountId = opts?.keeperAccountId ?? requireEnv("KEEPER_ACCOUNT_ID");
  const keeperPrivateKey = opts?.keeperPrivateKey ?? requireEnv("KEEPER_PRIVATE_KEY");

  const provider = new JsonRpcProvider({ url: rpcUrl });
  const keeper = new Account(
    keeperAccountId,
    provider,
    keeperPrivateKey as KeyPairString,
  );

  let explorerLink: string | null = null;

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
      deposit: 1n, // ft_transfer requires 1 yoctoNEAR
      waitUntil: "FINAL",
    });

    // If we somehow reach here the network didn't block it — report as an
    // unexpected success (should never happen in a correctly configured demo).
    explorerLink = `${EXPLORER_TX}/${res.transaction.hash}`;
    // Treat this as a failure from the demo's perspective.
    return {
      success: false,
      error:
        "Unexpected: transaction was accepted. Check that the key is correctly restricted.",
      explorer_link: explorerLink,
      keeper_account_id: keeperAccountId,
      attempted_receiver: ftId,
      attempted_method: "ft_transfer",
    };
  } catch (err: unknown) {
    // Extract the tx hash from the error if the RPC included one.
    if (
      err &&
      typeof err === "object" &&
      "transaction_outcome" in err &&
      err.transaction_outcome &&
      typeof err.transaction_outcome === "object" &&
      "id" in err.transaction_outcome
    ) {
      const txHash = (err.transaction_outcome as { id: string }).id;
      explorerLink = `${EXPLORER_TX}/${txHash}`;
    }

    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);

    return {
      success: false,
      error: errorMessage,
      explorer_link: explorerLink,
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
      console.log(
        "\n✓ Blockchain correctly rejected the transfer attempt.",
      );
    })
    .catch((err) => {
      console.error("[illegal-attempt] fatal:", err);
      process.exit(1);
    });
}
