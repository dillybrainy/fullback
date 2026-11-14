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
  EXPLORER_BASE,
  type CollectorDeps,
  type DealView,
  type SettleResult,
} from "../collector/index.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Fixed "now" in nanoseconds for all tests. */
const NOW_NS = 1_000_000_000_000_000_000n;

/** An Active deal whose next installment is overdue (due_ns < NOW_NS). */
function overdueDeal(deal_id: number): DealView {
  return {
    deal_id,
    status: "Active",
    next_due_at_ns: (NOW_NS - 1n).toString(),
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
});
