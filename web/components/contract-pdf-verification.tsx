"use client";
import { useEffect, useRef, useState } from "react";
import { CONTRACT_ID, explorerAccountUrl, viewFunction } from "@/lib/near";
import { listAgreements, verifyAgreement } from "@/lib/contract-verification.mjs";
import type { Agreement } from "@/lib/contract-verification.mjs";

const read = (method: string, args: object, signal?: AbortSignal) => viewFunction<unknown>(CONTRACT_ID, method, args, signal);
type Verification = Awaited<ReturnType<typeof verifyAgreement>>;
const messages = {
  verified: ["PDF matches the recorded agreement", "Its exact bytes match the fingerprint stored on NEAR testnet. This does not validate the agreement’s signatures or contents."],
  mismatch: ["PDF does not match this agreement", "Its bytes differ from the fingerprint recorded for the selected agreement. Choose the correct agreement or its original PDF."],
  "not-found": ["Agreement no longer found", "This agreement could not be found on the configured testnet contract. Reload the list and choose another agreement."],
  unregistered: ["No PDF fingerprint recorded", "This agreement has no recorded PDF fingerprint, so its file cannot be verified yet."],
};

export function ContractPdfVerification({ pdfHash }: { pdfHash: string }) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Verification | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState({ nextIndex: 0, hasMore: false });
  const listing = useRef<AbortController | null>(null);
  const verification = useRef<AbortController | null>(null);
  async function load(from = 0) {
    listing.current?.abort();
    const controller = new AbortController(); listing.current = controller;
    setLoading(true); setLoadError("");
    try {
      const data = await listAgreements(read, from, controller.signal);
      if (!controller.signal.aborted) {
        setAgreements(previous => from === 0 ? data.agreements : [...previous, ...data.agreements.filter(item => !previous.some(old => old.deal_id === item.deal_id))]);
        setPage({ nextIndex: data.nextIndex, hasMore: data.hasMore });
      }
    } catch (cause) { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : "Unable to load agreements. Please retry."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController(); listing.current = controller;
    listAgreements(read, 0, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setAgreements(data.agreements);
        setPage({ nextIndex: data.nextIndex, hasMore: data.hasMore });
      }
    }).catch(cause => {
      if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : "Unable to load agreements. Please retry.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); listing.current?.abort(); verification.current?.abort(); };
  }, []);
  async function verify(value: string) {
    verification.current?.abort();
    setSelected(value); setResult(null); setError("");
    if (!value) { setChecking(false); return; }
    const controller = new AbortController(); verification.current = controller;
    setChecking(true);
    try {
      const checked = await verifyAgreement({ read, dealId: Number(value), pdfHash, signal: controller.signal });
      if (!controller.signal.aborted) setResult(checked);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to verify this PDF. Please retry."); }
    finally { if (!controller.signal.aborted) setChecking(false); }
  }
  return <section className="pdf-check-panel" aria-labelledby="contract-check-title">
    <h3 id="contract-check-title">Compare with a recorded agreement</h3>
    <p className="help">Choose a NEAR testnet agreement. Only the fingerprint is sent; your PDF stays in this browser.</p>
    <label className="field-label" htmlFor="verification-agreement">Agreement</label>
    <select id="verification-agreement" value={selected} onChange={event => void verify(event.target.value)} disabled={!agreements.length}>
      <option value="">{loading ? "Loading agreements…" : "Choose an agreement"}</option>
      {agreements.map(deal => <option key={deal.deal_id} value={deal.deal_id}>#{deal.deal_id} · {deal.player_name} · {deal.seller_id} → {deal.buyer_id}</option>)}
    </select>
    {loading && <p className="help" role="status">Loading recorded agreements…</p>}
    {!loading && !loadError && !agreements.length && <p role="status">No agreements have been recorded on this testnet contract yet.</p>}
    {loadError && <p className="error-message" role="alert">{loadError}</p>}
    {(loadError || page.hasMore) && <button type="button" className="button soft" disabled={loading} onClick={() => void load(loadError && !agreements.length ? 0 : page.nextIndex)}>{loadError ? "Retry loading agreements" : "Load more agreements"}</button>}
    <div aria-live="polite" aria-busy={checking}>
      {checking && <p role="status">Checking the fingerprint against NEAR…</p>}
      {result && <div className={"verification-result " + result.status} role="status"><strong>{messages[result.status][0]}</strong><p className="help">{messages[result.status][1]}</p></div>}
    </div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {selected && !checking && <button type="button" className="button soft" onClick={() => void verify(selected)}>{error ? "Retry verification" : "Check again"}</button>}
    <a className="contract-source" href={explorerAccountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">View testnet contract: {CONTRACT_ID}</a>
  </section>;
}
