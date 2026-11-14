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

// ---------------------------------------------------------------------------
// Value checks: a verbatim quote is not enough — the extracted VALUE must be
// written in the document too. Otherwise the model can quote a real sentence
// and still invent the number or date (e.g. a birth date the PDF never states).
// ---------------------------------------------------------------------------

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Does `text` contain the whole-number `amount`, with or without thousands separators? */
export function containsAmount(text: string, amount: number): boolean {
  const want = String(amount);
  // Runs of digits that may be split by , . ' or spaces (e.g. "2,500,000", "2.500.000").
  const runs = text.match(/\d+(?:[,.'  ]\d{3})*/g) ?? [];
  return runs.some((r) => r.replace(/[^\d]/g, "") === want);
}

/** Does `text` contain the ISO date `iso` (YYYY-MM-DD) in a common written form? */
export function containsDate(text: string, iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [, y, mm, dd] = m;
  const d = Number(dd);
  const month = MONTHS[Number(mm) - 1];
  if (!month) return false;
  const t = text.toLowerCase();
  const day = `0?${d}(?:st|nd|rd|th)?`;
  const patterns = [
    `\\b${day} (?:of )?${month},? ${y}\\b`, // 9 August 2004, 9th of August 2004
    `\\b${month} ${day},? ${y}\\b`, // August 9, 2004
    `\\b${y}-${mm}-${dd}\\b`, // 2004-08-09
    `\\b0?${d}[./-]0?${Number(mm)}[./-]${y}\\b`, // 09/08/2004, 9.8.2004
  ];
  return patterns.some((p) => new RegExp(p).test(t));
}

/** Does `text` state the percentage `p` in digits (e.g. "15%", "15 percent")? */
export function containsPercent(text: string, p: number): boolean {
  return new RegExp(`(?:^|[^\\d.])${p}\\s*(?:%|percent|per cent)`, "i").test(text);
}

export interface ValueCheck {
  field: string;
  message: string;
}

/**
 * Values that are not written where they should be.
 * Amounts and percentages must appear inside their own quote; dates must
 * appear somewhere in the document (quotes often stop before the date list).
 * `pdfText` must already be normalised with `normalizeWs`.
 */
export function findUnsupportedValues(pdfText: string, llm: ReaderLLM): ValueCheck[] {
  const out: ValueCheck[] = [];
  const amount = (field: string, quote: string, value: number) => {
    if (!containsAmount(quote, value)) {
      out.push({ field, message: `The amount ${value} for ${field} is not written in its quote.` });
    }
  };
  const date = (field: string, value: string) => {
    if (!containsDate(pdfText, value)) {
      out.push({ field, message: `The date ${value} for ${field} is not written anywhere in the PDF.` });
    }
  };

  date("player.birthDate", llm.player.birthDate);
  amount("fee", llm.fee.quote, llm.fee.amount);
  llm.installments.forEach((i) => {
    amount(`installments[${i.index}]`, i.quote, i.amount);
    date(`installments[${i.index}].dueDate`, i.dueDate);
  });
  // A zero collateral may legitimately be written as words ("no security").
  if (llm.collateral && llm.collateral.amount > 0) {
    amount("collateral", llm.collateral.quote, llm.collateral.amount);
  }
  if (!containsPercent(llm.sellOn.quote, llm.sellOn.percent)) {
    out.push({
      field: "sellOn",
      message: `The sell-on percentage ${llm.sellOn.percent}% is not written in its quote.`,
    });
  }
  return out;
}

/**
 * Names the document defines as the Seller or the Buyer, e.g.
 * `Harbour City FC, a football club (the "Seller")`. Used to keep the parties
 * out of the training clubs: the contract rejects a training club that is
 * also the seller or the buyer.
 */
export function isPartyName(pdfText: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${esc}[^()]{0,80}\\(the\\s+["“]?(?:seller|buyer)["”]?\\)`, "i").test(pdfText);
}
