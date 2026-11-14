"use client";
import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import { createPdfFingerprint } from "@/lib/pdf-fingerprint.mjs";

export function PdfFingerprint({ mode = "verify" }: { mode?: "verify" | "upload" }) {
  const [result, setResult] = useState<{ name: string; hash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  async function readFile(file?: File) {
    if (!file) return;
    const current = ++request.current;
    setResult(null); setError(""); setBusy(true);
    try {
      const hash = await createPdfFingerprint(file);
      if (current === request.current) setResult({ name: file.name, hash });
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : "Unable to read this file. Please choose it again.");
    } finally {
      if (current === request.current) setBusy(false);
    }
  }
  function drop(event: DragEvent<HTMLElement>) { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]); }
  return <section className={"dropzone" + (dragging ? " dragging" : "")} aria-labelledby="fingerprint-heading" onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={drop}>
    <span className="upload-symbol"><Image src="/images/57-2-imgIconUpload.svg" width={32} height={32} alt="" /></span>
    <h2 id="fingerprint-heading">{mode === "upload" ? "Drop the signed agreement here" : "Drop the PDF here, or browse"}</h2>
    {mode === "upload" && <p>PDF only, up to 20 MB. Its SHA-256 fingerprint is computed in your browser, then the AI reads it and fills in every term with the clause it came from.</p>}
    <input ref={picker} id="agreement-pdf" className="sr-only" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={event => { void readFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} aria-label="Choose an agreement PDF" />
    <button className={"button" + (mode === "verify" ? " soft" : "")} onClick={() => picker.current?.click()} disabled={busy}>{busy ? "Calculating fingerprint…" : "Choose PDF"}</button>
    <p className="help">{mode === "upload" ? "No signed agreement yet? FULLBACK only works from a PDF both clubs already signed." : "Compare with: R. Santos · Riverside SC → Kingsport FC"}</p>
    <div role="status" aria-live="polite" aria-busy={busy}>{busy && <div className="fingerprint-skeleton"><span /><span /></div>}{result && <div className="fingerprint-result"><p>Fingerprint calculated for <strong className="file-name">{result.name}</strong></p><label className="field-label" htmlFor="sha256-result">SHA-256 fingerprint</label><textarea id="sha256-result" className="fingerprint-value" readOnly value={result.hash} rows={3} spellCheck={false} /><p className="help"><strong>Not yet verified against the contract.</strong> On-chain comparison and AI reading are not connected. Your file stays in this browser.</p></div>}</div>
    {error && <p className="error-message" role="alert">{error}</p>}
  </section>;
}
