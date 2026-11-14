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
import type { ReaderOutput } from "../schema.js";
import { enrichReaderOutput } from "./enrich.js";
import { readAgreementWithLlm } from "./llm.js";
import { extractPdfText, sha256Hex } from "./pdf.js";
// JSON is imported (not read from disk by path) so the Reader also works when a
// bundler packs it into the web's API route (/api/reader).
import clubsJson from "../clubs.json" with { type: "json" };
import deal1Json from "../fixtures/deal1.json" with { type: "json" };
import deal2Json from "../fixtures/deal2.json" with { type: "json" };
import ok01Json from "../fixtures/ok01-basic.json" with { type: "json" };
import ok02Json from "../fixtures/ok02-unequal-installments.json" with { type: "json" };
import verifyTamperedJson from "../fixtures/verify-ok01-tampered.json" with { type: "json" };

/** Club name → testnet account (concrete `*.fullback-team.testnet`, see clubs.json). */
export const clubs: Record<string, string> = clubsJson;

/** Test-suite fixture format: exact PDF fingerprint + the Reader's answer. */
interface FixtureFile {
  /** SHA-256 of the exact PDF bytes (hex, lowercase) — the DEMO_MODE lookup key. */
  pdfHash: string;
  /** The Reader's answer for that PDF (`ReaderOutput`). */
  output: ReaderOutput;
}

// Lucas demo (PLAN.md R1–R4, locked numbers). Plain `ReaderOutput` files: the
// web tests and scripts read them in this shape, so it must not change.
const deal1Fixture = deal1Json as unknown as ReaderOutput;
const deal2Fixture = deal2Json as unknown as ReaderOutput;
// Neutral test-suite agreements, usable in DEMO_MODE without restoring a PDF.
const ok01Fixture = ok01Json as unknown as FixtureFile;
const ok02Fixture = ok02Json as unknown as FixtureFile;
const verifyTamperedFixture = verifyTamperedJson as unknown as FixtureFile;

/**
 * DEMO_MODE answer keys: PDF SHA-256 → ReaderOutput (details in
 * agent/fixtures/README.md). Hashes are of the committed LF bytes; keep
 * `*.pdf -text` (.gitattributes) so a Windows checkout cannot change them.
 *  - Lucas Deal 1/2 PDFs: only in git history (commit f741c98), used by
 *    `npm run demo` and the Phase 2 judge demo.
 *  - sample-agreements/tests/OK-01 and OK-02: in the working tree.
 */
export const DEMO_FIXTURES_BY_HASH: Record<string, ReaderOutput> = {
  // deal1-nordvik-portoalegre.pdf (Lucas, R2/R3)
  eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832: deal1Fixture,
  // deal2-portoalegre-clubz.pdf (Lucas resale, R4)
  "2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e": deal2Fixture,
  // tests/OK-01-basic.pdf
  [ok01Fixture.pdfHash]: ok01Fixture.output,
  // tests/OK-02-unequal-installments.pdf
  [ok02Fixture.pdfHash]: ok02Fixture.output,
  // tests/VERIFY-OK-01-TAMPERED.pdf — dokumen rusak yang jujur dibaca apa
  // adanya (sell-on 5%), untuk memperlihatkan perbedaannya dengan yang asli.
  [verifyTamperedFixture.pdfHash]: verifyTamperedFixture.output,
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
          "(or OK-02-unequal-installments.pdf), or the Lucas demo PDF from git history " +
          "(`git checkout f741c98 -- sample-agreements/deal1-nordvik-portoalegre.pdf`). " +
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
