/**
 * index.ts — the AI Reader entry point used by `web/` and scripts.
 *
 *   readPdf(pdfBytes)
 *     ├─ DEMO_MODE=true  → returns the fixture whose SHA-256 matches the PDF
 *     │                    (no API key, no network — KTD6)
 *     └─ live            → extract text → NEAR AI Cloud → validate → enrich
 *
 * Always returns the PDF's SHA-256 alongside the output: the web needs it for
 * `create_deal`'s `pdf_hash` (R12).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReaderOutput } from "../schema.js";
import { enrichReaderOutput } from "./enrich.js";
import { readAgreementWithLlm } from "./llm.js";
import { extractPdfText, sha256Hex } from "./pdf.js";

const AGENT_DIR = dirname(fileURLToPath(import.meta.url));

function loadJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(resolve(AGENT_DIR, "..", ...segments), "utf8")) as T;
}

/** Club name → testnet account (concrete `*.fullback-team.testnet`, see clubs.json). */
export const clubs = loadJson<Record<string, string>>("clubs.json");

/** Fixture file format: exact PDF fingerprint + the Reader's answer. */
interface FixtureFile {
  /** SHA-256 of the exact PDF bytes (hex, lowercase) — the DEMO_MODE lookup key. */
  pdfHash: string;
  /** The Reader's answer for that PDF (`ReaderOutput`). */
  output: ReaderOutput;
}

const deal1Fixture = loadJson<FixtureFile>("fixtures", "deal1.json");
const deal2Fixture = loadJson<FixtureFile>("fixtures", "deal2.json");

/**
 * DEMO_MODE answer keys: PDF SHA-256 → ReaderOutput. Since 15 Nov the demo
 * PDFs are the test-suite agreements sample-agreements/tests/OK-01-basic.pdf
 * and OK-02-unequal-installments.pdf (details in agent/fixtures/README.md).
 * The hashes match the committed LF bytes recorded in tests/manifest.json —
 * keep `*.pdf -text` (.gitattributes) so a Windows checkout cannot change them.
 */
export const DEMO_FIXTURES_BY_HASH: Record<string, ReaderOutput> = {
  // tests/OK-01-basic.pdf
  [deal1Fixture.pdfHash]: deal1Fixture.output,
  // tests/OK-02-unequal-installments.pdf
  [deal2Fixture.pdfHash]: deal2Fixture.output,
};

export interface ReadPdfResult {
  output: ReaderOutput;
  /** SHA-256 of the exact PDF bytes (hex, lowercase). */
  pdfHash: string;
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function readPdf(data: Uint8Array, options: { signal?: AbortSignal; maxPages?: number; maxTextChars?: number } = {}): Promise<ReadPdfResult> {
  options.signal?.throwIfAborted();
  const pdfHash = sha256Hex(data);

  if (isDemoMode()) {
    const fixture = DEMO_FIXTURES_BY_HASH[pdfHash];
    if (!fixture) {
      throw new Error(
        `DEMO_MODE is on and this PDF (sha256 ${pdfHash}) is not one of the demo agreements. ` +
          "Upload one of the demo PDFs: sample-agreements/tests/OK-01-basic.pdf " +
          "(or OK-02-unequal-installments.pdf). " +
          "Or turn DEMO_MODE off (with an API key) to read any agreement.",
      );
    }
    return { output: fixture, pdfHash };
  }

  const text = await extractPdfText(data, options);
  if (!text.trim()) throw new Error("This PDF has no readable text. Choose a text PDF; scanned documents need OCR first.");
  const llm = await readAgreementWithLlm(text, options.signal);
  const output = enrichReaderOutput(llm, text, { clubs });
  return { output, pdfHash };
}
