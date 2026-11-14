/** Read-only NEAR RPC. PDF bytes and wallet keys are never sent here.
 * @param {{rpcUrl:string, contractId:string, method:string, args?:object, signal?:AbortSignal, timeoutMs?:number, fetchImpl?:typeof fetch}} options
 */
export async function callView({ rpcUrl, contractId, method, args = {}, signal, timeoutMs = 15000, fetchImpl = fetch }) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("NEAR verification timed out. Please retry.", "TimeoutError")), timeoutMs);
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(args));
    const response = await fetchImpl(rpcUrl, {
      method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "fullback", method: "query", params: {
        request_type: "call_function", finality: "final", account_id: contractId,
        method_name: method, args_base64: btoa(String.fromCharCode(...bytes)),
      } }),
    });
    if (!response.ok) throw new Error(`NEAR is unavailable (HTTP ${response.status}). Please retry.`);
    const body = await response.json();
    if (body.error || body.result?.error) throw new Error("The testnet contract could not complete this request. Check the configured contract and retry.");
    const result = body.result?.result;
    if (!Array.isArray(result) || !result.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) throw new Error("NEAR returned an invalid contract response.");
    try { return JSON.parse(new TextDecoder().decode(new Uint8Array(result))); }
    catch { throw new Error("NEAR returned an unreadable contract response."); }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
