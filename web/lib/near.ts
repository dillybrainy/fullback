// NEAR settings for the browser. Testnet only (PLAN.md KTD1): the network is a
// constant, not an environment variable, so a deploy can never point at mainnet.
// Contract addresses are public; NEXT_PUBLIC_* overrides exist for a redeploy.
import { callView } from "./near-rpc.mjs";
export const NEAR_NETWORK = "testnet" as const;
export const NEAR_RPC_URL = "https://test.rpc.fastnear.com";
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "fullback.fullback-team.testnet";
export const FT_ID = process.env.NEXT_PUBLIC_FT_ID || "feur.fullback-team.testnet";
export const FEUR_DECIMALS = 6;

export function explorerAccountUrl(accountId: string) {
  return "https://testnet.nearblocks.io/address/" + encodeURIComponent(accountId);
}

/** Read-only contract call through RPC. Needs no wallet and costs nothing. */
export async function viewFunction<T>(contractId: string, method: string, args: object = {}, signal?: AbortSignal): Promise<T> {
  return callView({ rpcUrl: NEAR_RPC_URL, contractId, method, args, signal }) as Promise<T>;
}

/** "12500000000000" (6 decimals) -> "12,500,000 fEUR". Whole euros; cents are dropped. */
export function formatFeur(units: string | bigint) {
  const whole = BigInt(units) / BigInt(10 ** FEUR_DECIMALS);
  return whole.toLocaleString("en-US") + " fEUR";
}
