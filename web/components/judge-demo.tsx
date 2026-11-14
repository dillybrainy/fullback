"use client";
// Judge demo mode (PLAN.md Phase 2, R18): the Lucas story on NEAR testnet, step by
// step, without a wallet. The server signs with demo accounts (/api/demo/*); the
// collector agent settles late installments through /api/collector/tick.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatFeur } from "@/lib/near";

type Installment = { amount: string; due_at_ns: string | null; paid: boolean; paid_from_collateral: boolean };
type Deal = {
  deal_id: number; kind: string; status: string; player_id: string; price: string;
  installments: Installment[]; installments_paid: number; next_due_at_ns: string | null;
  collateral_required: string; collateral_balance: string; needs_top_up: boolean; total_paid: string; training_paid: string; pdf_hash: string;
};
type Party = { id: string; name: string; role: string };
type State = { deal: Deal | null; resale: Deal | null; balances: Record<string, string>; parties: Party[]; now: number };
type Step = { label: string; hash: string | null; at: number; refused?: boolean };

const STORAGE = "fullback-judge-demo";
const TX = (hash: string) => "https://testnet.nearblocks.io/txns/" + hash;
const M = BigInt(1000000) * BigInt(1000000); // one million fEUR in base units
// Net change per party after the full story, minted test tokens excluded (PLAN.md R3, R4).
const EXPECTED: Record<string, bigint> = {
  "Nordvik IF": BigInt(12500000) * BigInt(1000000), // 9,500,000 installments + 3,000,000 sell-on
  "Kota FC": BigInt(1200000) * BigInt(1000000),
  "Akademi Desa": BigInt(300000) * BigInt(1000000),
  "Porto Alegre FC": BigInt(6) * M,
  "Club Z": -BigInt(20) * M,
};
const MINTED: Record<string, bigint> = { "Porto Alegre FC": BigInt(12500000) * BigInt(1000000), "Club Z": BigInt(20) * M };

function load(): { dealId?: number; resaleId?: number; steps: Step[]; start?: Record<string, string> } {
  try { return JSON.parse(sessionStorage.getItem(STORAGE) ?? "") ?? { steps: [] }; } catch { return { steps: [] }; }
}

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "The demo server did not answer. Please retry." }));
  if (!res.ok) throw new Error(data.error ?? "The demo step failed. Please retry.");
  return data as T;
}

function signed(units: bigint) {
  const s = formatFeur(units < BigInt(0) ? -units : units);
  return (units < BigInt(0) ? "−" : units > BigInt(0) ? "+" : "") + s;
}

export function JudgeDemo() {
  const [dealId, setDealId] = useState<number | undefined>();
  const [resaleId, setResaleId] = useState<number | undefined>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [start, setStart] = useState<Record<string, string> | undefined>();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const [offset, setOffset] = useState(0); // server clock minus browser clock
  const ticking = useRef(false);

  // Restore this tab's run after a reload. sessionStorage only exists in the browser,
  // so it is read after hydration rather than during the static prerender.
  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
    setDealId(saved.dealId); setResaleId(saved.resaleId); setSteps(saved.steps ?? []); setStart(saved.start);
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE, JSON.stringify({ dealId, resaleId, steps, start })); } catch { /* storage blocked */ }
  }, [dealId, resaleId, steps, start]);

  const refresh = useCallback(async (d = dealId, r = resaleId) => {
    const q = new URLSearchParams();
    if (d !== undefined) q.set("dealId", String(d));
    if (r !== undefined) q.set("resaleId", String(r));
    const res = await fetch("/api/demo/state?" + q, { cache: "no-store" });
    const data = await res.json().catch(() => ({ error: "Judge demo mode is not available on this deployment." }));
    if (!res.ok) throw new Error(data.error);
    setOffset(data.now - Date.now());
    setState(data);
    return data as State;
  }, [dealId, resaleId]);

  // Read the live deal and balances whenever the tracked deal changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches testnet state; setState runs after the response
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t); }, []);

  const addSteps = (more: { label: string; hash: string | null }[]) =>
    setSteps((s) => [...more.map((m) => ({ ...m, at: Date.now(), refused: m.hash === null })).reverse(), ...s]);

  async function run(action: string) {
    setBusy(action); setError("");
    try {
      let begin = start;
      if (action === "create") {
        const fresh = await refresh(undefined, undefined);
        begin = fresh.balances; setStart(fresh.balances); setSteps([]); setResaleId(undefined);
      }
      const res = await post<{ steps: { label: string; hash: string | null }[]; dealId: number; resaleDealId?: number }>("/api/demo/" + action, { dealId });
      addSteps(res.steps);
      setDealId(res.dealId);
      if (res.resaleDealId !== undefined) setResaleId(res.resaleDealId);
      if (begin) setStart(begin);
      await refresh(res.dealId, res.resaleDealId ?? resaleId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The demo step failed.");
    } finally {
      setBusy(null);
    }
  }

  const deal = state?.deal ?? null;
  const resale = state?.resale ?? null;
  const now = clock + offset;
  const dueMs = deal?.next_due_at_ns ? Number(BigInt(deal.next_due_at_ns) / BigInt(1000000)) : null;
  const secondsLeft = dueMs === null ? null : Math.ceil((dueMs - now) / 1000);

  // Collector agent: every 15 s while the deal is active (and right when a due date passes).
  useEffect(() => {
    if (!deal || deal.status !== "Active" || dealId === undefined) return;
    const tick = async () => {
      if (ticking.current) return;
      ticking.current = true;
      try {
        const res = await post<{ result: string; step?: { label: string; hash: string } }>("/api/collector/tick", { dealId });
        if (res.step) { addSteps([res.step]); await refresh(); }
      } catch { /* the next tick retries */ } finally { ticking.current = false; }
    };
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [deal, dealId, refresh]);
  useEffect(() => {
    if (secondsLeft === -3 && deal?.status === "Active" && dealId !== undefined && !ticking.current) {
      ticking.current = true;
      post<{ step?: { label: string; hash: string } }>("/api/collector/tick", { dealId })
        .then(async (res) => { if (res.step) { addSteps([res.step]); await refresh(); } })
        .catch(() => {}).finally(() => { ticking.current = false; });
    }
  }, [secondsLeft, deal?.status, dealId, refresh]);

  // What the judge can do next, from the live deal state.
  const paid = deal?.installments_paid ?? 0;
  const usedCollateral = deal?.installments.some((i) => i.paid_from_collateral) ?? false;
  let next: { action: string; label: string; help: string; accent?: boolean } | null = null;
  if (!deal) next = { action: "create", label: "Start the story", help: "Porto Alegre FC buys Lucas from Nordvik IF for 10,000,000 fEUR in 4 installments. The AI-read terms become a deal on NEAR testnet." };
  else if (deal.status === "Proposed") next = { action: "approve", label: "Approve as Nordvik IF", help: "The seller checks the terms and the PDF fingerprint, then approves." };
  else if (deal.status === "Approved") next = { action: "deposit", label: "Deposit collateral", help: "Porto Alegre FC locks 2,500,000 fEUR, equal to one installment. The payment clock starts." };
  else if (deal.status === "Active" && paid === 0) next = { action: "pay", label: "Pay installment 1", help: "Each installment is split automatically: 95% to Nordvik IF, 4% to Kota FC, 1% to Akademi Desa." };
  else if (deal.status === "Active" && deal.needs_top_up) next = { action: "topup", label: "Top up collateral", accent: true, help: "Installment 2 was late, so the collector agent paid it from the collateral. Top up before installment 3 is due, or the deal defaults." };
  else if (deal.status === "Active" && !usedCollateral) next = null; // waiting for installment 2 to be late
  else if (deal.status === "Active") next = { action: "pay", label: `Pay installment ${paid + 1}`, help: "Back on schedule. Pay the remaining installments." };
  else if (deal.status === "Completed" && BigInt(deal.collateral_balance) > BigInt(0)) next = { action: "release", label: "Withdraw the collateral", help: "All installments are paid, so the buyer gets its collateral back." };
  else if (deal.status === "Completed" && !resale) next = { action: "resale", label: "Resell Lucas to Club Z", help: "Club Z pays 20,000,000 fEUR in one payment. Nordvik IF gets its 15% sell-on and the academies their royalties, in the same transaction." };

  const waiting = deal?.status === "Active" && paid >= 1 && !usedCollateral && !deal.needs_top_up;
  const finished = resale?.status === "Completed";
  const defaulted = deal?.status === "Defaulted";

  return <div className="workspace judge-demo">
    <header className="page-heading"><h1>Judge demo: the Lucas transfer, live on NEAR testnet</h1><p>Run the whole story without a wallet. Every step is a real testnet transaction signed by demo club accounts, with a nearblocks link. Test tokens only (1 fEUR = €1).</p></header>

    <section className={"panel demo-bar" + (next?.accent ? " demo-bar-accent" : "")} aria-live="polite">
      <div className="demo-bar-main">
        {defaulted ? <><h2>The deal defaulted</h2><p className="help">Installment 3 fell due while the collateral was empty, so the contract marked the deal Defaulted. Start again to replay the story.</p></>
          : finished ? <><h2>Story complete</h2><p className="help">Both deals are settled on testnet. Check every party&apos;s balance change below.</p></>
          : waiting ? <><h2>Installment 2 is coming due{secondsLeft !== null && secondsLeft > 0 ? ` in ${secondsLeft} s` : ""}</h2><p className="help">Porto Alegre FC will not pay it. When it is late, the collector agent calls <code>settle_due</code> and the collateral pays Nordvik IF and the academies. No click needed.{secondsLeft !== null && secondsLeft <= 0 ? " Settling now…" : ""}</p></>
          : next ? <><h2>{next.label}</h2><p className="help">{next.help}{next.action === "topup" && secondsLeft !== null && secondsLeft > 0 ? ` Installment 3 is due in ${secondsLeft} s.` : ""}</p></> : <h2>Loading…</h2>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </div>
      <div className="actions">
        {next && !defaulted && !finished && <button type="button" className={"button" + (next.accent ? " accent" : "")} disabled={busy !== null} onClick={() => void run(next!.action)}>{busy === next.action ? "Sending to testnet…" : next.label}</button>}
        {deal && <button type="button" className="button soft" disabled={busy !== null} onClick={() => void run("rogue")}>{busy === "rogue" ? "Trying…" : "Try the rogue agent"}</button>}
        {deal && <button type="button" className="button soft" disabled={busy !== null} onClick={() => void run("create")}>{busy === "create" ? "Starting…" : "Start again"}</button>}
      </div>
    </section>

    {deal && <section className="panel deal-summary">
      <div className="deal-summary-top"><p>Deal {deal.deal_id} · {deal.player_id} · fingerprint {deal.pdf_hash.slice(0, 12)}…</p><span className={"status" + (deal.needs_top_up ? " warning" : deal.status === "Completed" || deal.status === "Resold" ? " paid" : "")}>{deal.needs_top_up ? "Must top up" : deal.status}</span></div>
      <div className="deal-parties"><div><small>Seller</small><h2>Nordvik IF</h2></div><div><small>Transfer fee</small><h1>{formatFeur(deal.price)}</h1></div><div><small>Buyer</small><h2>Porto Alegre FC</h2></div></div>
      <div className="deal-metrics">
        <div><small>Paid so far</small><strong>{formatFeur(deal.total_paid)}</strong><span>{paid} of {deal.installments.length} installments</span></div>
        <div><small>Collateral</small><strong className={deal.needs_top_up ? "danger-text" : ""}>{formatFeur(deal.collateral_balance)}</strong><span>of {formatFeur(deal.collateral_required)}</span></div>
        <div><small>Sell-on</small><strong>15%</strong><span>to Nordvik IF on resale{resale ? " · paid" : ""}</span></div>
        <div><small>Academy royalties</small><strong>{formatFeur(BigInt(deal.training_paid) + BigInt(resale?.training_paid ?? "0"))}</strong><span>Kota FC 4% · Akademi Desa 1%</span></div>
      </div>
      <ol className="installments">{deal.installments.map((item, i) => <li key={i}><span className={"step-number " + (item.paid ? "done" : "")}>{i + 1}</span><div><strong>Installment {i + 1} of {deal.installments.length}</strong><small>{item.due_at_ns ? "Due " + new Date(Number(BigInt(item.due_at_ns) / BigInt(1000000))).toLocaleTimeString() : "Due after the collateral is deposited"}</small></div><span className={"status " + (item.paid_from_collateral ? "warning" : item.paid ? "paid" : "")}>{item.paid_from_collateral ? "Paid from collateral" : item.paid ? "Paid" : "Open"}</span><strong>{formatFeur(item.amount)}</strong></li>)}</ol>
    </section>}

    <div className="deal-grid">
      <section className="panel"><h2>Activity on testnet</h2>
        {steps.length ? <ul className="compact-list">{steps.map((s, i) => <li key={i}><div><strong>{s.label}</strong><small>{s.hash ? <a href={TX(s.hash)} target="_blank" rel="noreferrer">View on nearblocks ↗</a> : s.refused ? "Refused before reaching a block, so there is no transaction to link." : ""}</small></div><small>{new Date(s.at).toLocaleTimeString()}</small></li>)}</ul> : <p className="help">No steps yet. Start the story to create a fresh deal.</p>}
      </section>
      <section className="panel"><h2>fEUR balance changes</h2>
        <p className="help">Since this run started, minted test tokens excluded. {finished ? "Compared with the agreement:" : "The expected totals are checked when the story is complete."}</p>
        {state && start ? <table className="demo-balances"><thead><tr><th>Party</th><th>Change</th>{finished && <th>Expected</th>}</tr></thead><tbody>{state.parties.map((p) => {
          const raw = BigInt(state.balances[p.id] ?? "0") - BigInt(start[p.id] ?? "0");
          // Start balances are read just before the deal is created, so the buyer's mint
          // is always inside this run; Club Z's mint happens with the resale.
          const minted = p.name === "Porto Alegre FC" ? MINTED[p.name] : p.name === "Club Z" && resale ? MINTED[p.name] : BigInt(0);
          const net = raw - minted;
          const ok = net === EXPECTED[p.name];
          return <tr key={p.id}><td>{p.name}<small>{p.role}</small></td><td>{signed(net)}</td>{finished && <td>{signed(EXPECTED[p.name])} {ok ? "✓" : "≠"}</td>}</tr>;
        })}</tbody></table> : <p className="help">Balances appear after the first step.</p>}
        {finished && <p className="help">Another judge running the demo at the same moment can shift these numbers; each run uses its own deal.</p>}
      </section>
    </div>
  </div>;
}
