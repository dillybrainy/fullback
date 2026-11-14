/**
 * agent/tests/collector.test.ts
 * Unit tests for the FULLBACK Collector Agent (U5).
 *
 * All tests use injected mock deps — no NEAR network, no env vars needed.
 * The fixed NOW_NS constant controls "current time" so overdue/future comparisons
 * are deterministic.
 */

import { describe, it, expect } from "vitest";
import {
  tick,
  createTickState,
  EXPLORER_BASE,
  DUE_SAFETY_MARGIN_NS,
  NOT_DUE_COOLDOWN_NS,
  type CollectorDeps,
  type DealView,
  type SettleResult,
} from "../collector/index.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Fixed "now" in nanoseconds for all tests. */
const NOW_NS = 1_000_000_000_000_000_000n;

/**
 * An Active deal whose next installment is safely overdue: past the local
 * clock by more than the DUE_SAFETY_MARGIN_NS (due_ns + margin < NOW_NS).
 */
function overdueDeal(deal_id: number): DealView {
  return {
    deal_id,
    status: "Active",
    next_due_at_ns: (NOW_NS - DUE_SAFETY_MARGIN_NS - 1n).toString(),
  };
}

/** An Active deal whose next installment is in the future (due_ns > NOW_NS). */
function futureDeal(deal_id: number): DealView {
  return {
    deal_id,
    status: "Active",
    next_due_at_ns: (NOW_NS + 1_000_000_000n).toString(),
  };
}

/** A deal in a non-Active status (should always be skipped). */
function inactiveDeal(
  deal_id: number,
  status: DealView["status"],
): DealView {
  return { deal_id, status, next_due_at_ns: null };
}

/** A mock CollectorDeps with controllable responses. */
function makeDeps(
  deals: DealView[],
  settleReturn: SettleResult = {
    result: "PaidFromCollateral",
    installment_index: 0,
  },
): CollectorDeps & { settleDueCalls: number[] } {
  const settleDueCalls: number[] = [];
  return {
    settleDueCalls,
    async listDeals(from = 0, limit = 100) {
      return deals.slice(from, from + limit);
    },
    async settleDue(deal_id: number) {
      settleDueCalls.push(deal_id);
      return {
        hash: `fakehash${deal_id}`,
        value: settleReturn,
      };
    },
    nowNs: () => NOW_NS,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tick()", () => {
  it("calls settleDue once for a single overdue installment", async () => {
    const deps = makeDeps([overdueDeal(0)]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([0]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      deal_id: 0,
      result: "PaidFromCollateral",
      installment_index: 0,
      tx_hash: "fakehash0",
      explorer_link: `${EXPLORER_BASE}/fakehash0`,
    });
  });

  it("returns empty and calls nothing when there are no deals", async () => {
    const deps = makeDeps([]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([]);
    expect(results).toEqual([]);
  });

  it("skips a future installment (not yet overdue)", async () => {
    const deps = makeDeps([futureDeal(1)]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([]);
    expect(results).toEqual([]);
  });

  it("skips non-Active deals (Proposed, Approved, Completed, Defaulted, Resold)", async () => {
    const statuses: DealView["status"][] = [
      "Proposed",
      "Approved",
      "Completed",
      "Defaulted",
      "Resold",
    ];
    const deals = statuses.map((s, i) => inactiveDeal(i, s));
    const deps = makeDeps(deals);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([]);
    expect(results).toEqual([]);
  });

  it("skips an Active deal with null next_due_at_ns (all paid)", async () => {
    const deal: DealView = { deal_id: 5, status: "Active", next_due_at_ns: null };
    const deps = makeDeps([deal]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([]);
    expect(results).toEqual([]);
  });

  it("processes only the overdue deal when mixed with future and inactive deals", async () => {
    const deals: DealView[] = [
      inactiveDeal(0, "Completed"),
      futureDeal(1),
      overdueDeal(2),
      inactiveDeal(3, "Defaulted"),
    ];
    const deps = makeDeps(deals);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([2]);
    expect(results).toHaveLength(1);
    expect(results[0].deal_id).toBe(2);
  });

  it("handles multiple overdue deals in one tick", async () => {
    const deps = makeDeps([overdueDeal(10), overdueDeal(11), overdueDeal(12)]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([10, 11, 12]);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.deal_id)).toEqual([10, 11, 12]);
  });

  it("does not crash when called twice in a row", async () => {
    const deps = makeDeps([overdueDeal(7)]);
    const r1 = await tick(deps);
    const r2 = await tick(deps);

    // Second tick sees the same mock data — still one overdue deal.
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(deps.settleDueCalls).toHaveLength(2);
  });

  it("includes Defaulted in results when settle_due returns Defaulted", async () => {
    const deps = makeDeps(
      [overdueDeal(3)],
      { result: "Defaulted", installment_index: null },
    );
    const results = await tick(deps);

    expect(results[0].result).toBe("Defaulted");
    expect(results[0].installment_index).toBeNull();
  });

  it("includes explorer_link with correct base URL", async () => {
    const deps = makeDeps([overdueDeal(99)]);
    const results = await tick(deps);

    expect(results[0].explorer_link).toBe(
      `https://testnet.nearblocks.io/txns/fakehash99`,
    );
  });

  it("pages through more than 100 deals", async () => {
    // 150 deals: first 100 are inactive, last 50 contain one overdue deal.
    const deals: DealView[] = [
      ...Array.from({ length: 100 }, (_, i) => inactiveDeal(i, "Completed")),
      ...Array.from({ length: 49 }, (_, i) => futureDeal(100 + i)),
      overdueDeal(149),
    ];
    const deps = makeDeps(deals);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([149]);
    expect(results).toHaveLength(1);
    expect(results[0].deal_id).toBe(149);
  });

  it("waits for the safety margin before calling settle_due (local clock can run ahead of block time)", async () => {
    // Overdue by 1 ns only — inside the margin, must NOT be called yet.
    const deal: DealView = {
      deal_id: 4,
      status: "Active",
      next_due_at_ns: (NOW_NS - 1n).toString(),
    };
    const deps = makeDeps([deal]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([]);
    expect(results).toEqual([]);
  });

  it("calls settle_due once the due time is past the safety margin", async () => {
    const deal: DealView = {
      deal_id: 4,
      status: "Active",
      next_due_at_ns: (NOW_NS - DUE_SAFETY_MARGIN_NS - 1n).toString(),
    };
    const deps = makeDeps([deal]);
    const results = await tick(deps);

    expect(deps.settleDueCalls).toEqual([4]);
    expect(results).toHaveLength(1);
  });

  it("after a NotDue result, does not retry the deal until the cooldown elapses", async () => {
    let now = NOW_NS;
    const settleDueCalls: number[] = [];
    const deps: CollectorDeps & { settleDueCalls: number[] } = {
      settleDueCalls,
      async listDeals(from = 0, limit = 100) {
        return [overdueDeal(1)].slice(from, from + limit);
      },
      async settleDue(deal_id: number) {
        settleDueCalls.push(deal_id);
        return {
          hash: `fakehash${deal_id}`,
          value: { result: "NotDue", installment_index: null },
        };
      },
      nowNs: () => now,
    };
    const state = createTickState();

    await tick(deps, state);
    await tick(deps, state); // still inside the cooldown window
    expect(settleDueCalls).toEqual([1]);

    now += NOT_DUE_COOLDOWN_NS + 1n; // cooldown over — retry allowed
    await tick(deps, state);
    expect(settleDueCalls).toEqual([1, 1]);
  });

  it("still records the NotDue result in the tick entries", async () => {
    const deps = makeDeps(
      [overdueDeal(6)],
      { result: "NotDue", installment_index: null },
    );
    const results = await tick(deps);

    expect(results[0]).toMatchObject({
      deal_id: 6,
      result: "NotDue",
      tx_hash: "fakehash6",
    });
  });

  it("one failing settle_due does not stop the rest of the tick", async () => {
    const settleDueCalls: number[] = [];
    const deps: CollectorDeps & { settleDueCalls: number[] } = {
      settleDueCalls,
      async listDeals(from = 0, limit = 100) {
        return [overdueDeal(1), overdueDeal(2), overdueDeal(3)].slice(
          from,
          from + limit,
        );
      },
      async settleDue(deal_id: number) {
        settleDueCalls.push(deal_id);
        if (deal_id === 2) throw new Error("NotEnoughAllowance");
        return {
          hash: `fakehash${deal_id}`,
          value: {
            result: "PaidFromCollateral",
            installment_index: 0,
          },
        };
      },
      nowNs: () => NOW_NS,
    };
    const results = await tick(deps);

    // All three deals were attempted and the two healthy ones were settled.
    expect(settleDueCalls).toEqual([1, 2, 3]);
    expect(results.map((r) => r.deal_id)).toEqual([1, 2, 3]);
    expect(results.map((r) => r.result)).toEqual([
      "PaidFromCollateral",
      "Error",
      "PaidFromCollateral",
    ]);
  });

  it("records the error message and has no tx link for a failed settle_due", async () => {
    const deps: CollectorDeps = {
      async listDeals(from = 0, limit = 100) {
        return [overdueDeal(2)].slice(from, from + limit);
      },
      async settleDue() {
        throw new Error("NotEnoughAllowance");
      },
      nowNs: () => NOW_NS,
    };
    const results = await tick(deps);

    expect(results[0]).toEqual({
      deal_id: 2,
      result: "Error",
      installment_index: null,
      tx_hash: null,
      explorer_link: null,
      error: "NotEnoughAllowance",
    });
  });
});
