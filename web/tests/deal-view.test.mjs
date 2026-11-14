import assert from "node:assert/strict";
import test from "node:test";
import { dashboardDealView, federationDealVisible, initialDashboardView, matchesDealStatus } from "../lib/deal-view.mjs";

// Different amounts from the UI sample catch accidental hardcoded payments.
const deal = {
  seller: "River Club", buyer: "Harbour FC", player: "A. Player", status: "Must top up",
  recipients: [
    { name: "River Club", role: "Seller", amount: 950 },
    { name: "Youth Academy", role: "Academy royalties", amount: 40 },
    { name: "Village Academy", role: "Academy royalties", amount: 10 },
  ],
  installments: [
    { amount: 1000, status: "Paid by buyer" },
    { amount: 1000, status: "Paid from collateral" },
    { amount: 1000, status: "Upcoming" },
  ],
};

test("dashboard defaults to the selling club", () => {
  assert.deepEqual(initialDashboardView(deal), { club: "River Club", view: "Selling" });
});
test("buying link selects the buyer and buying category", () => {
  assert.deepEqual(initialDashboardView(deal, { tab: "buying" }), { club: "Harbour FC", view: "Buying" });
});
test("academy link selects a real royalty recipient and takes precedence over buying", () => {
  assert.deepEqual(initialDashboardView(deal, { role: "academy", tab: "buying" }), { club: "Youth Academy", view: "Academy royalties" });
});
test("unknown role and missing academy fall back to a usable club view", () => {
  assert.deepEqual(initialDashboardView(deal, { role: "unknown" }), initialDashboardView(deal));
  assert.deepEqual(initialDashboardView({ ...deal, recipients: [] }, { role: "academy" }), initialDashboardView(deal));
});
test("seller sees their share, including royalties already deducted", () => {
  const result = dashboardDealView(deal, deal.seller, "Selling");
  assert.equal(result.visible, true);
  assert.equal(result.buying, false);
  assert.equal(result.nextAmount, 950);
  assert.equal(result.receivedAmount, 1900);
  assert.equal(result.paidCount, 2);
});
test("buyer owes the full installment rather than the seller's net share", () => {
  const result = dashboardDealView(deal, deal.buyer, "Buying");
  assert.equal(result.visible, true);
  assert.equal(result.buying, true);
  assert.equal(result.nextAmount, 1000);
  assert.equal(result.receivedAmount, 2000);
});
test("category selection does not change payment direction or amount", () => {
  const result = dashboardDealView(deal, deal.buyer, "Selling");
  assert.equal(result.visible, false);
  assert.equal(result.buying, true);
  assert.equal(result.nextAmount, 1000);
});
test("each academy receives only its own royalty", () => {
  for (const [club, amount] of [["Youth Academy", 40], ["Village Academy", 10]]) {
    const result = dashboardDealView(deal, club, "Academy royalties");
    assert.equal(result.visible, true);
    assert.equal(result.recipient.name, club);
    assert.equal(result.nextAmount, amount);
    assert.equal(result.receivedAmount, amount * 2);
  }
});
test("unrelated clubs cannot see the agreement or inherit seller income", () => {
  for (const category of ["Selling", "Buying", "Academy royalties"]) {
    const result = dashboardDealView(deal, "Unrelated FC", category);
    assert.equal(result.visible, false);
    assert.equal(result.nextAmount, 0);
    assert.equal(result.receivedAmount, 0);
  }
});
test("completed deals have no next payment", () => {
  const completed = { ...deal, status: "Completed", installments: deal.installments.map(item => ({ ...item, status: "Paid by buyer" })) };
  for (const [club, category] of [[deal.seller, "Selling"], [deal.buyer, "Buying"], ["Youth Academy", "Academy royalties"]]) {
    const result = dashboardDealView(completed, club, category, "Completed");
    assert.equal(result.visible, true);
    assert.equal(result.nextAmount, 0);
    assert.equal(result.paidCount, 3);
  }
});
test("must-top-up is an active agreement and matches both relevant filters", () => {
  for (const filter of ["All", "All statuses", "Active", "Must top up"]) {
    assert.equal(matchesDealStatus("Must top up", filter), true);
    assert.equal(dashboardDealView(deal, deal.seller, "Selling", filter).visible, true);
  }
  for (const filter of ["Completed", "Defaulted", "Proposed", "unknown"]) {
    assert.equal(matchesDealStatus("Must top up", filter), false);
    assert.equal(dashboardDealView(deal, deal.seller, "Selling", filter).visible, false);
  }
});
test("other statuses do not leak into the active filter", () => {
  for (const status of ["Completed", "Defaulted", "Proposed", "Approved", "Resold"]) {
    assert.equal(matchesDealStatus(status, status), true);
    assert.equal(matchesDealStatus(status, "Active"), false);
  }
  assert.equal(matchesDealStatus("Active", "Must top up"), false);
});
test("federation finds players, sellers, and buyers regardless of case or outer whitespace", () => {
  for (const search of ["a. PLAYER", " RIVER CLUB ", "harbour", "", "   "]) {
    assert.equal(federationDealVisible(deal, "All", search), true);
  }
});
test("federation combines the status and text filters", () => {
  assert.equal(federationDealVisible(deal, "Active", "player"), true);
  assert.equal(federationDealVisible(deal, "Defaulted", "player"), false);
  assert.equal(federationDealVisible(deal, "All", "nonexistent"), false);
});
test("federation does not match across concatenated field boundaries", () => {
  assert.equal(federationDealVisible(deal, "All", "clubharbour"), false);
});
test("view calculations leave source deal data unchanged", () => {
  const before = structuredClone(deal);
  dashboardDealView(deal, deal.seller, "Selling");
  federationDealVisible(deal, "All", "player");
  initialDashboardView(deal, { role: "academy" });
  assert.deepEqual(deal, before);
});
