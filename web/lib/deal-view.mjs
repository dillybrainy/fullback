/**
 * @typedef {{name: string, role: string, amount: number}} Recipient
 * @typedef {{seller: string, buyer: string, player: string, status: string,
 * recipients: readonly Recipient[],
 * installments: readonly {amount: number, status: string}[]}} ViewDeal
 * @typedef {"Selling" | "Buying" | "Academy royalties"} DealCategory
 */

/** @param {string} dealStatus @param {string} filter */
export function matchesDealStatus(dealStatus, filter) {
  return filter === "All" || filter === "All statuses" || filter === dealStatus ||
    (filter === "Active" && dealStatus === "Must top up");
}

/**
 * @param {ViewDeal} deal
 * @param {{role?: string, tab?: string}} [options]
 * @returns {{club: string, view: DealCategory}}
 */
export function initialDashboardView(deal, { role, tab } = {}) {
  if (role === "academy") {
    const academy = deal.recipients.find(item => item.role === "Academy royalties");
    if (academy) return { club: academy.name, view: "Academy royalties" };
  }
  return tab === "buying"
    ? { club: deal.buyer, view: "Buying" }
    : { club: deal.seller, view: "Selling" };
}

/**
 * Calculate the selected club's share, independently of the selected category.
 * A category controls visibility; it does not change who pays or receives money.
 * @param {ViewDeal} deal
 * @param {string} club
 * @param {DealCategory} category
 * @param {string} [status]
 */
export function dashboardDealView(deal, club, category, status = "All statuses") {
  const recipient = deal.recipients.find(item => item.name === club && item.role === "Academy royalties");
  const buying = club === deal.buyer;
  const selling = club === deal.seller;
  const categoryVisible = category === "Selling" ? selling
    : category === "Buying" ? buying : Boolean(recipient);
  const paid = deal.installments.filter(item => item.status === "Paid by buyer" || item.status === "Paid from collateral");
  const upcoming = deal.installments.find(item => item.status === "Upcoming");
  const sellerShare = deal.recipients.find(item => item.name === deal.seller && item.role === "Seller")?.amount ?? 0;
  const share = recipient?.amount ?? (selling ? sellerShare : 0);
  return {
    recipient,
    buying,
    visible: categoryVisible && matchesDealStatus(deal.status, status),
    nextAmount: upcoming ? (buying ? upcoming.amount : share) : 0,
    receivedAmount: buying ? paid.reduce((total, item) => total + item.amount, 0) : share * paid.length,
    paidCount: paid.length,
  };
}

/** @param {ViewDeal} deal @param {string} status @param {string} search */
export function federationDealVisible(deal, status, search) {
  const query = search.trim().toLocaleLowerCase("en-GB");
  return matchesDealStatus(deal.status, status) &&
    [deal.player, deal.seller, deal.buyer].some(value => value.toLocaleLowerCase("en-GB").includes(query));
}
