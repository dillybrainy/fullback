"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, ScanText } from "lucide-react";
import { requestAiReview } from "@/lib/ai-review.mjs";

// Only fields rendered by this view. The backend validates the full frozen schema.
type Quoted = { quote: string; clause: string };
type ReviewedTerms = {
  player: Quoted & { name: string; birthDate: string };
  fee: Quoted & { amount: number; currency: string };
  sellOn: Quoted & { bps: number; basis: "gross" | "net" };
  collateral?: Quoted & { amount: number };
  installments: (Quoted & { amount: number; dueDate: string })[];
  trainingClubs: (Quoted & { name: string; bps: number })[];
  warnings: { field: string; message: string }[];
};

const money = (amount: number, currency: string) => `${amount.toLocaleString("en-US")} ${currency}`;
const clock = (totalSeconds: number) => `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;

function Source({ term }: { term: { quote: string; clause: string } }) {
  return <details className="reader-source"><summary>Clause {term.clause}</summary><blockquote>{term.quote}</blockquote></details>;
}

/** Seconds since the running review started. Ticks outside any live region, so
 * screen readers hear the operation once, not every second. */
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="ai-review-elapsed">Elapsed {clock(seconds)}</span>;
}

export function PdfAiReview({ file, pdfHash }: { file: File; pdfHash: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<{ output: ReviewedTerms; mode: "live" | "demo" } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function examine() {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(""); setReview(null);
    try {
      const data = await requestAiReview({ file, pdfHash, url: process.env.NEXT_PUBLIC_READER_API_URL || "/api/reader", signal: controller.signal });
      if (!controller.signal.aborted) setReview(data as { output: ReviewedTerms; mode: "live" | "demo" });
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "AI review could not be reached. Please retry later."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const output = review?.output;
  return <section className="pdf-check-panel" aria-labelledby="ai-review-title">
    <h3 id="ai-review-title">Review the agreement’s contents</h3>
    <p className="help">Send this PDF for AI review of its terms, amounts, and supporting clauses. This does not register or sign an agreement.</p>
    <button type="button" className="button" disabled={busy} onClick={() => void examine()}>
      {busy ? <Loader2 className="ai-review-spin" size={18} aria-hidden="true" /> : error ? <RefreshCw size={18} aria-hidden="true" /> : <ScanText size={18} aria-hidden="true" />}
      <span>{busy ? "Reviewing agreement…" : error ? "Retry AI review" : review ? "Review again with AI" : "Review agreement with AI"}</span>
    </button>
    {busy ? (
      <div className="ai-review-status">
        <p className="ai-review-status-line" role="status">
          <ScanText size={18} aria-hidden="true" />
          <span>The AI is reading clauses, amounts, and quotes in this agreement.</span>
        </p>
        <p className="ai-review-status-line help">
          <Clock size={15} aria-hidden="true" />
          <span>This usually takes about a minute.</span>
          <ElapsedTimer />
        </p>
      </div>
    ) : null}
    {error ? <p className="error-message" role="alert"><AlertTriangle size={16} aria-hidden="true" /><span>{error}</span></p> : null}
    {output ? <div className="reader-result" aria-live="polite">
      <h4><CheckCircle2 size={18} aria-hidden="true" />{review?.mode === "demo" ? "Demo fixture review" : "AI review complete"}</h4>
      <p className="help">{output.warnings.length ? "Review the warnings and source clauses before relying on these terms." : "No warnings were raised by the Reader’s current checks. Review the source clauses; this is not proof that every term is correct."}</p>
      {!!output.warnings.length && <ul className="reader-warnings">{output.warnings.map((warning, i) => <li key={i}><strong>{warning.field}</strong>: {warning.message}</li>)}</ul>}
      <dl className="reader-terms">
        <div><dt>Player</dt><dd>{output.player.name} · {output.player.birthDate}<Source term={output.player} /></dd></div>
        <div><dt>Transfer fee</dt><dd>{money(output.fee.amount, output.fee.currency)}<Source term={output.fee} /></dd></div>
        <div><dt>Sell-on</dt><dd>{output.sellOn.bps / 100}% of {output.sellOn.basis}<Source term={output.sellOn} /></dd></div>
        <div><dt>Collateral</dt><dd>{output.collateral ? <>{money(output.collateral.amount, output.fee.currency)}<Source term={output.collateral} /></> : "No collateral clause extracted"}</dd></div>
      </dl>
      <h4>Installments</h4>
      <ol className="reader-payments">{output.installments.map((item, i) => <li key={i}>{money(item.amount, output.fee.currency)} · {item.dueDate}<Source term={item} /></li>)}</ol>
      <h4>Academy royalties</h4>
      {output.trainingClubs.length ? <ul className="reader-payments">{output.trainingClubs.map((club, i) => <li key={i}>{club.name}: {club.bps / 100}%<Source term={club} /></li>)}</ul> : <p className="help">No academy royalty recipients extracted.</p>}
    </div> : null}
  </section>;
}
