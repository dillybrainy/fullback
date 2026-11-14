// NEAR settings for the browser. Testnet only (PLAN.md KTD1): the network is a
// constant, not an environment variable, so a deploy can never point at mainnet.
// Contract addresses are public; NEXT_PUBLIC_* overrides exist for a redeploy.
export const NEAR_NETWORK = "testnet" as const;
export const NEAR_RPC_URL = "https://test.rpc.fastnear.com";
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "fullback.fullback-team.testnet";
export const FT_ID = process.env.NEXT_PUBLIC_FT_ID || "feur.fullback-team.testnet";
export const FEUR_DECIMALS = 6;

export function explorerAccountUrl(accountId: string) {
  return "https://testnet.nearblocks.io/address/" + encodeURIComponent(accountId);
}

/** Read-only contract call through RPC. Needs no wallet and costs nothing. */
export async function viewFunction<T>(contractId: string, method: string, args: object = {}): Promise<T> {
  const bytes = new TextEncoder().encode(JSON.stringify(args));
  const res = await fetch(NEAR_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "fullback",
      method: "query",
      params: { request_type: "call_function", finality: "final", account_id: contractId, method_name: method, args_base64: btoa(String.fromCharCode(...bytes)) },
    }),
  });
  const body = await res.json();
  if (body.error || body.result?.error) throw new Error(body.error?.cause?.name ?? body.result?.error ?? "RPC error");
  return JSON.parse(new TextDecoder().decode(new Uint8Array(body.result.result)));
}

/** "12500000000000" (6 decimals) -> "12,500,000 fEUR". Whole euros; cents are dropped. */
export function formatFeur(units: string | bigint) {
  const whole = BigInt(units) / BigInt(10 ** FEUR_DECIMALS);
  return whole.toLocaleString("en-US") + " fEUR";
}
