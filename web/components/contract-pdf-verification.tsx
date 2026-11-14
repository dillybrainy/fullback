"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Minus, Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"" | "recorded" | "missing">("");
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Verification | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState({ nextIndex: 0, hasMore: false });
  const listing = useRef<AbortController | null>(null);
  const verification = useRef<AbortController | null>(null);
  // Client-side filter across the fields an agreement is known by. The selected
  // agreement always stays visible so a search can never discard the result.
  const needle = query.trim().toLowerCase();
  const visible = agreements.filter(deal => {
    if (filter === "recorded" && !deal.pdf_hash) return false;
    if (filter === "missing" && deal.pdf_hash) return false;
    return !needle || String(deal.deal_id).includes(needle) || [deal.player_name, deal.seller_id, deal.buyer_id].some(value => value.toLowerCase().includes(needle));
  });
  if (selected) {
    const current = agreements.find(deal => String(deal.deal_id) === selected);
    if (current && !visible.includes(current)) visible.unshift(current);
  }
  // Display pagination over the filtered list; the "Load more" button below
  // still fetches further batches from the chain.
  const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const pageNow = Math.min(pageNo, pageCount);
  const rows = visible.slice((pageNow - 1) * perPage, pageNow * perPage);
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
    <label className="field-label" htmlFor="agreement-search">Search</label>
    <div className="agreement-search">
      <Search size={16} aria-hidden="true" />
      <input id="agreement-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setPageNo(1); }} placeholder="Number, player, or club" disabled={!agreements.length} />
    </div>
    <div className="agreement-filters" role="group" aria-label="Filter agreements">
      <button type="button" aria-pressed={filter === ""} className={filter === "" ? "is-active" : ""} onClick={() => { setFilter(""); setPageNo(1); }}>All</button>
      <button type="button" aria-pressed={filter === "recorded"} className={filter === "recorded" ? "is-active" : ""} onClick={() => { setFilter("recorded"); setPageNo(1); }}>Fingerprint recorded</button>
      <button type="button" aria-pressed={filter === "missing"} className={filter === "missing" ? "is-active" : ""} onClick={() => { setFilter("missing"); setPageNo(1); }}>No fingerprint</button>
    </div>
    <div className="agreement-table" role="radiogroup" aria-label="Agreement">
      <div className="agreement-table-head" aria-hidden="true"><span>#</span><span>Player</span><span>Transfer</span><span>Fingerprint</span></div>
      {loading && <p className="help" role="status">Loading recorded agreements…</p>}
      {rows.map(deal => {
        const isCurrent = String(deal.deal_id) === selected;
        return (
          <button key={deal.deal_id} type="button" role="radio" aria-checked={isCurrent} className={"agreement-row" + (isCurrent ? " is-selected" : "")} onClick={() => void verify(String(deal.deal_id))}>
            <span className="agreement-id">{`#${deal.deal_id} ·`}</span>
            <span className="agreement-player">{deal.player_name}</span>
            <span className="agreement-route"><span>{deal.seller_id}</span> <ArrowRight size={13} aria-hidden="true" /> <span>{deal.buyer_id}</span></span>
            {deal.pdf_hash ? <span className="agreement-badge ok"><Check size={12} aria-hidden="true" /> Recorded</span> : <span className="agreement-badge none"><Minus size={12} aria-hidden="true" /> None</span>}
          </button>
        );
      })}
      {!loading && !loadError && !!agreements.length && !visible.length && <p role="status">No agreements match your search.</p>}
      {!loading && !loadError && !agreements.length && <p role="status">No agreements have been recorded on this testnet contract yet.</p>}
    </div>
    {visible.length > perPage && (
      <div className="agreement-pagination">
        <label className="agreement-page-size">Rows per page
          <select value={perPage} onChange={event => { setPerPage(Number(event.target.value)); setPageNo(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <span className="agreement-count">Showing {(pageNow - 1) * perPage + 1}–{Math.min(pageNow * perPage, visible.length)} of {visible.length}</span>
        <nav className="agreement-pages" aria-label="Agreement pages">
          <button type="button" aria-label="Previous page" disabled={pageNow <= 1} onClick={() => setPageNo(pageNow - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => (
            <button key={number} type="button" aria-label={`Page ${number}`} aria-current={number === pageNow ? "page" : undefined} className={number === pageNow ? "is-current" : ""} onClick={() => setPageNo(number)}>{number}</button>
          ))}
          <button type="button" aria-label="Next page" disabled={pageNow >= pageCount} onClick={() => setPageNo(pageNow + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
        </nav>
      </div>
    )}
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
