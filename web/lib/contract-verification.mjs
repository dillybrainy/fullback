/** @typedef {{deal_id:number, player_name:string, seller_id:string, buyer_id:string, pdf_hash:string}} Agreement */
/** @typedef {(method:string, args:object, signal?:AbortSignal)=>Promise<unknown>} ContractRead */

/** @returns {Agreement} */
function agreement(value) {
  if (!value || !Number.isSafeInteger(value.deal_id) || value.deal_id < 0 ||
      ![value.player_name, value.seller_id, value.buyer_id, value.pdf_hash].every(v => typeof v === "string")) {
    throw new Error("The contract returned an invalid agreement.");
  }
  return value;
}

/** @param {ContractRead} read @param {number} fromIndex @param {AbortSignal} [signal] */
export async function listAgreements(read, fromIndex = 0, signal) {
  const result = await read("list_deals", { from_index: fromIndex, limit: 50 }, signal);
  if (!Array.isArray(result)) throw new Error("The contract returned an invalid agreement list.");
  return { agreements: result.map(agreement), hasMore: result.length === 50, nextIndex: fromIndex + result.length };
}

/** @param {{read:ContractRead, dealId:number, pdfHash:string, signal?:AbortSignal}} options
 * @returns {Promise<{status:"verified"|"mismatch"|"not-found"|"unregistered", deal:Agreement|null}>}
 */
export async function verifyAgreement({ read, dealId, pdfHash, signal }) {
  if (!Number.isSafeInteger(dealId) || dealId < 0) throw new Error("Choose a valid agreement.");
  if (!/^[a-f\d]{64}$/i.test(pdfHash)) throw new Error("Calculate a valid PDF fingerprint first.");
  const result = await read("get_deal", { deal_id: dealId }, signal);
  if (result === null) return { status: "not-found", deal: null };
  const deal = agreement(result);
  if (deal.deal_id !== dealId) throw new Error("The contract returned a different agreement. Please retry.");
  if (!deal.pdf_hash) return { status: "unregistered", deal };
  if (!/^[a-f\d]{64}$/i.test(deal.pdf_hash)) throw new Error("This agreement has an invalid recorded fingerprint.");
  const matches = await read("verify_pdf_hash", { deal_id: dealId, pdf_hash: pdfHash }, signal);
  if (typeof matches !== "boolean" || matches !== (deal.pdf_hash.toLowerCase() === pdfHash.toLowerCase())) throw new Error("The contract returned inconsistent verification data. Please retry.");
  return { status: matches ? "verified" : "mismatch", deal };
}
