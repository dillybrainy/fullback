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

const deal1Fixture = loadJson<ReaderOutput>("fixtures", "deal1.json");
const deal2Fixture = loadJson<ReaderOutput>("fixtures", "deal2.json");

/**
 * SHA-256 of each demo PDF (PLAN.md R1–R4). The demo PDFs were removed from
 * sample-agreements/ on 15 Nov (only tests/ remains there); the committed LF
 * bytes live on in git history at commit f741c98. Restore one with:
 *   git checkout f741c98 -- sample-agreements/deal1-nordvik-portoalegre.pdf
 * Regenerating the PDF can change the bytes (CRLF) and therefore the hash.
 */
export const DEMO_FIXTURES_BY_HASH: Record<string, ReaderOutput> = {
  // deal1-nordvik-portoalegre.pdf
  eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832: deal1Fixture,
  // deal2-portoalegre-clubz.pdf
  "2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e": deal2Fixture,
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
          "Restore the demo PDF from git history and upload it: " +
          "`git checkout f741c98 -- sample-agreements/deal1-nordvik-portoalegre.pdf`. " +
          "Or turn DEMO_MODE off (with an API key) to read any agreement, " +
          "e.g. sample-agreements/tests/OK-01-basic.pdf.",
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
