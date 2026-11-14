/** @param {{file:File,pdfHash:string,url?:string,signal?:AbortSignal,fetchImpl?:typeof fetch}} options */
export async function requestAiReview({ file, pdfHash, url = "/api/reader", signal, fetchImpl = fetch }) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("The AI review timed out before the Reader finished. Reviews rarely exceed a minute — please try again.", "TimeoutError")), 78000);
  try {
    const response = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file, signal: controller.signal });
    if (response.status === 413) throw new Error("This PDF is larger than this deployment accepts for AI review. Choose a smaller agreement.");
    let result;
    try { result = await response.json(); } catch { throw new Error("AI review is not available on this deployment."); }
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "AI review is unavailable. Please retry later.");
    if (result.pdfHash !== pdfHash) throw new Error("The reviewed PDF does not match your selected file. Please choose it again.");
    const out = result.output;
    const quoted = item => item && typeof item.quote === "string" && typeof item.clause === "string";
    const amount = value => Number.isSafeInteger(value) && value >= 0;
    if (!["live", "demo"].includes(result.mode) || !out ||
      !quoted(out.player) || typeof out.player.name !== "string" || typeof out.player.birthDate !== "string" ||
      !quoted(out.fee) || !amount(out.fee.amount) || typeof out.fee.currency !== "string" ||
      !Array.isArray(out.installments) || !out.installments.length || !out.installments.every(item => quoted(item) && amount(item.amount) && typeof item.dueDate === "string") ||
      !quoted(out.sellOn) || !amount(out.sellOn.bps) || !["gross", "net"].includes(out.sellOn.basis) ||
      (out.collateral && (!quoted(out.collateral) || !amount(out.collateral.amount))) ||
      !Array.isArray(out.trainingClubs) || !out.trainingClubs.every(item => quoted(item) && typeof item.name === "string" && amount(item.bps)) ||
      !Array.isArray(out.warnings) || !out.warnings.every(item => typeof item.message === "string" && typeof item.field === "string")) {
      throw new Error("The AI Reader returned incomplete review data. Please retry.");
    }
    return result;
  } finally { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); }
}
