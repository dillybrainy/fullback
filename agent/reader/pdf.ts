/**
 * pdf.ts — PDF text extraction and SHA-256 hashing.
 *
 * Uses pdfjs-dist v4 (Mozilla, maintained). The legacy build is used because
 * the reader runs in Node (and on Vercel's Node runtime), where the browser
 * build's DOM APIs are unavailable.
 *
 * The old `pdf-parse` package is NOT used: its bundled pdf.js (v1.10, 2016)
 * misparses the compressed streams of our sample PDFs (it returned Deal 1's
 * text for `deal2-portoalegre-clubz.pdf`).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);

// The 14 standard fonts (Helvetica etc.) ship inside pdfjs-dist. The Node
// build needs this path to embed them; without it pdf.js logs warnings.
// Must end with "/" — pdf.js resolves font names against it as a URL base.
// Best effort: when a bundler packs this file, require.resolve may not return a
// path; text extraction still works without the fonts.
const STANDARD_FONT_DATA_URL = (() => {
  try {
    const pkg: unknown = require.resolve("pdfjs-dist/package.json");
    return typeof pkg === "string" ? join(dirname(pkg), "standard_fonts") + "/" : undefined;
  } catch {
    return undefined;
  }
})();

/** SHA-256 of the exact PDF bytes, hex, lowercase (R12: Contract Fingerprint). */
export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** All text of a PDF, whitespace-normalised: every run of spaces/newlines becomes one space. */
export async function extractPdfText(data: Uint8Array, options: { signal?: AbortSignal; maxPages?: number; maxTextChars?: number } = {}): Promise<string> {
  options.signal?.throwIfAborted();
  const doc = await getDocument({
    data,
    isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    disableFontFace: true,
  }).promise;
  try {
    if (doc.numPages > (options.maxPages ?? Infinity)) throw new Error(`This PDF exceeds the ${options.maxPages}-page review limit.`);
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      options.signal?.throwIfAborted();
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items as { str?: string }[]) {
        if (typeof item.str === "string") out += item.str + " ";
      }
      out += "\n";
      if (out.length > (options.maxTextChars ?? Infinity)) throw new Error("This PDF contains too much text for one review. Choose a shorter agreement.");
    }
    return out.replace(/\s+/g, " ").trim();
  } finally {
    await doc.destroy();
  }
}
