"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NearConnector } from "@hot-labs/near-connect";
import { NEAR_NETWORK } from "@/lib/near";

// Says only "a wallet was connected in this browser, try to restore it". It grants
// no access: the account id always comes from the wallet itself.
const RESTORE_MARKER = "fullback-wallet-connected";

export type WalletStatus = "idle" | "connecting" | "connected";

export interface FunctionCall {
  contractId: string;
  method: string;
  args: object;
  /** Gas in gas units, e.g. "30000000000000" for 30 TGas. */
  gas?: string;
  /** Attached deposit in yoctoNEAR. "1" for functions that require one yoctoNEAR. */
  deposit?: string;
}

interface WalletContextValue {
  status: WalletStatus;
  accountId: string | null;
  error: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Signs and sends one function call with the connected wallet. The wallet asks the user to confirm. */
  callFunction(call: FunctionCall): Promise<unknown>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function readMarker() {
  try { return localStorage.getItem(RESTORE_MARKER) === "1"; } catch { return false; }
}
function writeMarker(on: boolean) {
  try { if (on) localStorage.setItem(RESTORE_MARKER, "1"); else localStorage.removeItem(RESTORE_MARKER); } catch { /* storage blocked */ }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connectorRef = useRef<Promise<NearConnector> | null>(null);

  // The connector fetches the wallet list from the internet, so it is only loaded
  // when someone connects or a previous connection is being restored.
  const loadConnector = useCallback(() => {
    connectorRef.current ??= import("@hot-labs/near-connect").then(({ NearConnector }) => {
      const connector = new NearConnector({ network: NEAR_NETWORK });
      connector.on("wallet:signIn", ({ accounts }) => {
        const id = accounts[0]?.accountId ?? null;
        setAccountId(id);
        setStatus(id ? "connected" : "idle");
        writeMarker(Boolean(id));
      });
      connector.on("wallet:signOut", () => {
        setAccountId(null);
        setStatus("idle");
        writeMarker(false);
      });
      return connector;
    });
    return connectorRef.current;
  }, []);

  useEffect(() => {
    if (!readMarker()) return;
    let active = true;
    loadConnector()
      .then((connector) => {
        if (active) setStatus("connecting");
        return connector.getConnectedWallet();
      })
      .then(({ accounts }) => {
        if (!active) return;
        setAccountId(accounts[0].accountId);
        setStatus("connected");
      })
      .catch(() => {
        if (!active) return;
        writeMarker(false);
        setStatus("idle");
      });
    return () => { active = false; };
  }, [loadConnector]);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const connector = await loadConnector();
      await connector.connect();
    } catch {
      // Closing the wallet list also ends up here; it is not worth an alarming message.
      setStatus((current) => (current === "connected" ? current : "idle"));
      setError("No wallet connected. Pick a wallet that supports NEAR testnet and try again.");
    }
  }, [loadConnector]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      const connector = await loadConnector();
      await connector.disconnect();
    } finally {
      setAccountId(null);
      setStatus("idle");
      writeMarker(false);
    }
  }, [loadConnector]);

  const callFunction = useCallback(async ({ contractId, method, args, gas = "30000000000000", deposit = "0" }: FunctionCall) => {
    if (!accountId) throw new Error("Connect a NEAR wallet first.");
    const connector = await loadConnector();
    const wallet = await connector.wallet();
    return wallet.signAndSendTransaction({
      network: NEAR_NETWORK,
      signerId: accountId,
      receiverId: contractId,
      actions: [{ type: "FunctionCall", params: { methodName: method, args, gas, deposit } }],
    });
  }, [accountId, loadConnector]);

  const value = useMemo(() => ({ status, accountId, error, connect, disconnect, callFunction }), [status, accountId, error, connect, disconnect, callFunction]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
