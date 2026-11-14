/**
 * agent/tests/illegal-attempt.test.ts
 * Unit tests for the error classification of the cheating-agent demo (issue #10).
 *
 * Only an AccessKey… rejection (classes from near-api-js/rpc-errors) proves the
 * restricted keeper key blocked the ft_transfer attempt. Network errors, wrong
 * env, or other RPC failures prove nothing and must never be reported as a
 * chain rejection.
 */

import { describe, it, expect } from "vitest";
import {
  AccessKeyDepositWithFunctionCallActionError,
  AccessKeyNotEnoughAllowanceActionError,
  AccessKeyReceiverMismatchActionError,
} from "near-api-js/rpc-errors";
import { PublicKey } from "near-api-js";
import { classifyAttemptError } from "../collector/illegal-attempt.js";

describe("classifyAttemptError()", () => {
  it("counts AccessKeyReceiverMismatchActionError as a chain rejection", () => {
    // The expected error now that the attempt sends no deposit (issue #10):
    // "this key is only for the FULLBACK contract".
    const err = new AccessKeyReceiverMismatchActionError(
      "fullback.master.testnet",
      "feur.master.testnet",
      0,
      "txhash",
      "blockhash",
    );
    const out = classifyAttemptError(err);

    expect(out.outcome).toBe("rejected");
    expect(out.error_kind).toBe("AccessKeyReceiverMismatchActionError");
    expect(out.error).toContain("does not match");
  });

  it("counts AccessKeyDepositWithFunctionCallActionError as a chain rejection", () => {
    // The old error when the attempt wrongly attached deposit: 1n.
    const err = new AccessKeyDepositWithFunctionCallActionError(
      0,
      "txhash",
      "blockhash",
    );
    const out = classifyAttemptError(err);

    expect(out.outcome).toBe("rejected");
    expect(out.error_kind).toBe("AccessKeyDepositWithFunctionCallActionError");
  });

  it("counts AccessKeyNotEnoughAllowanceActionError as a chain rejection", () => {
    const err = new AccessKeyNotEnoughAllowanceActionError(
      "keeper.master.testnet",
      1000n,
      2000n,
      PublicKey.from("ed25519:11111111111111111111111111111111"),
      0,
      "txhash",
      "blockhash",
    );
    const out = classifyAttemptError(err);

    expect(out.outcome).toBe("rejected");
    expect(out.error_kind).toBe("AccessKeyNotEnoughAllowanceActionError");
  });

  it("does NOT count a network error as a chain rejection", () => {
    const out = classifyAttemptError(new Error("fetch failed"));

    expect(out.outcome).toBe("error");
    expect(out.error).toBe("fetch failed");
    expect(out.error_kind).toBe("Error");
  });

  it("does NOT count other RPC error classes as a chain rejection", () => {
    class ServerTransactionError extends Error {}
    const out = classifyAttemptError(
      new ServerTransactionError("transaction failed"),
    );

    expect(out.outcome).toBe("error");
    expect(out.error_kind).toBe("ServerTransactionError");
  });

  it("handles non-Error throws without claiming a rejection", () => {
    const out = classifyAttemptError("ECONNREFUSED");

    expect(out.outcome).toBe("error");
    expect(out.error).toBe("ECONNREFUSED");
    expect(out.error_kind).toBeNull();
  });
});
