"use client";
import { useEffect, useState } from "react";
import { StaticIcon as Image } from "./static-icon";
import { useWallet } from "./wallet-provider";
import { FT_ID, explorerAccountUrl, formatFeur, viewFunction } from "@/lib/near";

/** Step 1 of Sign in: connect or disconnect a NEAR testnet wallet. */
export function WalletConnect() {
  const { status, accountId, error, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    viewFunction<string>(FT_ID, "ft_balance_of", { account_id: accountId })
      .then((units) => { if (active) setBalance(formatFeur(units)); })
      .catch(() => { if (active) setBalance(null); });
    return () => { active = false; setBalance(null); };
  }, [accountId]);

  if (status === "connected" && accountId) {
    return <>
      <div className="soft-box wallet-connected" aria-live="polite">
        <span className="help">Connected on NEAR testnet</span>
        <a href={explorerAccountUrl(accountId)} target="_blank" rel="noreferrer"><strong>{accountId}</strong></a>
        <span className="help">{balance ? "fEUR balance: " + balance : "fEUR balance: checking…"}</span>
      </div>
      <button className="button soft full-width" onClick={() => void disconnect()}>Disconnect wallet</button>
      <p id="wallet-help" className="help">Dashboard, deals and federation open once they read live data from the contract.</p>
    </>;
  }

  return <>
    <button className="button full-width" onClick={() => void connect()} disabled={status === "connecting"} aria-describedby="wallet-help">
      <Image src="/images/44-514-imgIconWallet.svg" width={20} height={20} alt="" />
      {status === "connecting" ? "Connecting…" : "Connect NEAR wallet"}
    </button>
    <p id="wallet-help" className="help" aria-live="polite">{error ?? "Use a wallet that supports NEAR testnet, such as Meteor, Intear or Nightly."}</p>
  </>;
}
