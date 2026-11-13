/**
 * quotes.ts — verbatim quote checking (R14).
 *
 * Every number the model extracts must carry a quote that appears EXACTLY in
 * the PDF text. Quotes that do not match become `quote_not_found` warnings and
 * block deal creation until a human confirms.
 *
 * Matching is done after normalising whitespace (both sides), because PDF text
 * extraction breaks lines mid-sentence. The sample PDFs are ASCII-only, so no
 * typographic-character folding is needed.
 */
import type { ReaderLLM } from "../schema.js";

/** Collapse every run of whitespace into a single space. */
export function normalizeWs(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export interface QuoteCheck {
  /** Field path in the reader output, e.g. "fee" or "installments[1]". */
  field: string;
  quote: string;
  clause: string;
}

/** Every quote the model must support, in field order. */
export function collectQuotes(llm: ReaderLLM): QuoteCheck[] {
  const out: QuoteCheck[] = [];
  out.push({ field: "player", quote: llm.player.quote, clause: llm.player.clause });
  out.push({ field: "fee", quote: llm.fee.quote, clause: llm.fee.clause });
  llm.installments.forEach((i) => {
    out.push({ field: `installments[${i.index}]`, quote: i.quote, clause: i.clause });
  });
  if (llm.collateral) {
    out.push({ field: "collateral", quote: llm.collateral.quote, clause: llm.collateral.clause });
  }
  out.push({ field: "sellOn", quote: llm.sellOn.quote, clause: llm.sellOn.clause });
  llm.trainingClubs.forEach((c, idx) => {
    out.push({ field: `trainingClubs[${idx}]`, quote: c.quote, clause: c.clause });
  });
  return out;
}

/**
 * Quotes that do not appear verbatim in the (normalised) PDF text.
 * `pdfText` must already be normalised with `normalizeWs`.
 */
export function findUnmatchedQuotes(pdfText: string, checks: QuoteCheck[]): QuoteCheck[] {
  return checks.filter((c) => !pdfText.includes(normalizeWs(c.quote)));
}
