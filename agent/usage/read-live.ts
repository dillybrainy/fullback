/**
 * agent/usage/read-live.ts — Baca 1 PDF secara live dan tampilkan BIAYA NYATA.
 *
 *   npm run usage:read -w agent -- ../sample-agreements/deal1-nordvik-portoalegre.pdf
 *
 * Berbeda dengan `usage/cli.ts` (yang menampilkan perkiraan + status), tool ini
 * menjalankan Reader sungguhan lalu menampilkan pemakaian token NYATA yang
 * direkam dari field `usage` respons + `inference-id`, beserta biaya per read.
 * Ini cara yang benar untuk melihat biaya per pembacaan karena tracker bekerja
 * per-proses: pemanggilan Reader dan pembacaan usage harus dalam proses yang sama.
 *
 * Tidak pernah mencetak API key.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { readPdf } from "../reader/index.js";
import { getRealUsage } from "./index.js";

config({ path: resolve(process.cwd(), "..", ".env") });

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Pakai: npm run usage:read -w agent -- <file.pdf>");
    process.exit(1);
  }
  const bytes = new Uint8Array(readFileSync(pdfPath));

  // Paksa live: tool ini untuk MENGUKUR biaya nyata, jadi harus memanggil LLM.
  // Dengan DEMO_MODE=true Reader memakai fixture (tanpa LLM) sehingga usage tidak
  // terekam. Memaksa live juga membuat tool ini tidak terpengaruh isu hash CRLF
  // PDF Windows (yang hanya dipakai untuk pencocokan fixture).
  process.env.DEMO_MODE = "false";

  console.log(`Membaca ${pdfPath} via NEAR AI Cloud...`);
  const t0 = Date.now();
  const { output, pdfHash } = await readPdf(bytes);
  console.log(`Selesai dalam ${Date.now() - t0}ms. Fee terbaca: ${output.fee.amount} (hash ${pdfHash.slice(0, 12)}…)`);

  const real = await getRealUsage();
  if (!real.ok || !real.data) return;
  const r = real.data;
  console.log("\n=== PEMAKAIAN NYATA (dari field `usage` respons, bukan estimasi) ===");
  console.log(`Jumlah panggilan : ${r.totals.calls}`);
  console.log(`Input token      : ${r.totals.promptTokens}`);
  console.log(`Output token     : ${r.totals.completionTokens}`);
  console.log(`Total token      : ${r.totals.totalTokens}`);
  console.log(`Biaya read ini   : $${r.lastReadCostUsd.toFixed(6)}`);
  console.log(`Total biaya sesi : $${r.totalCostUsd.toFixed(6)}`);
  const lastId = r.records.filter((x) => x.inferenceId).slice(-1)[0];
  if (lastId) console.log(`inference-id     : ${lastId.inferenceId} (bisa dipakai di /v1/billing/costs)`);
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
