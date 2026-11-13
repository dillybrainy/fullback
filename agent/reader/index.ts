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

/** Club name → testnet account (placeholder `<master>` resolved by the web). */
export const clubs = loadJson<Record<string, string>>("clubs.json");

const deal1Fixture = loadJson<ReaderOutput>("fixtures", "deal1.json");
const deal2Fixture = loadJson<ReaderOutput>("fixtures", "deal2.json");

/**
 * SHA-256 of each demo PDF (see sample-agreements/README.md). The demo PDFs
 * must be the committed versions: regenerating them on Windows can change the
 * bytes (CRLF) and therefore the hash. If you see "not a demo agreement",
 * restore the PDFs with `git checkout -- sample-agreements`.
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

export async function readPdf(data: Uint8Array): Promise<ReadPdfResult> {
  const pdfHash = sha256Hex(data);

  if (isDemoMode()) {
    const fixture = DEMO_FIXTURES_BY_HASH[pdfHash];
    if (!fixture) {
      throw new Error(
        `DEMO_MODE is on and this PDF (sha256 ${pdfHash}) is not one of the demo agreements. ` +
          "Upload sample-agreements/deal1-nordvik-portoalegre.pdf (or deal2). " +
          "If you regenerated the PDFs locally, restore the committed versions with " +
          "`git checkout -- sample-agreements` (Windows line endings change the hash).",
      );
    }
    return { output: fixture, pdfHash };
  }

  const text = await extractPdfText(data);
  const llm = await readAgreementWithLlm(text);
  const output = enrichReaderOutput(llm, text, { clubs });
  return { output, pdfHash };
}
