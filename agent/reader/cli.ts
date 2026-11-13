/**
 * cli.ts — `npm run reader -- <path-to-pdf>` prints the reader output as JSON.
 * Uses DEMO_MODE from the environment (fixtures) or the live NEAR AI Cloud.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { readPdf } from "./index.js";

// Load the repo root .env (DEMO_MODE / NEARAI_API_KEY) for CLI convenience.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env") });

const path = process.argv[2];
if (!path) {
  console.error('Usage: npm run reader -- <path-to-pdf>\nExample: npm run reader -- sample-agreements/deal1-nordvik-portoalegre.pdf');
  process.exit(1);
}

try {
  const data = new Uint8Array(readFileSync(resolve(path)));
  const { output, pdfHash } = await readPdf(data);
  console.log(JSON.stringify({ pdfHash, output }, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
