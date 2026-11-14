/**
 * agent/usage/cli.ts — Jalankan monitoring NEAR AI Cloud dan cetak statusnya.
 *
 *   npm run usage -w agent              # ringkasan
 *   npm run usage -w agent -- --probe   # + uji model default benar-benar merespons
 *
 * Tidak pernah mencetak API key.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { getCloudStatus, estimateReadCost, getRealUsage } from "./index.js";

config({ path: resolve(process.cwd(), "..", ".env") });

const usd = (n: number): string => `$${n.toFixed(n < 0.01 ? 6 : 4)}`;

async function main(): Promise<void> {
  const probe = process.argv.includes("--probe");
  const status = await getCloudStatus({ probeModel: probe });
  const real = await getRealUsage();

  const h = status.health;
  console.log("\n=== NEAR AI Cloud Status ===");
  console.log(`Waktu cek        : ${status.checkedAt}`);
  console.log(`Layanan          : ${h.service.toUpperCase()}  (reachable=${h.reachable}, ${h.latencyMs}ms, version=${h.version ?? "-"})`);
  console.log(`Model default    : ${h.defaultModel}  (terdaftar di katalog: ${h.defaultModelListed})`);
  if (h.defaultModelResponds !== null && h.defaultModelResponds !== undefined) {
    console.log(`Model merespons  : ${h.defaultModelResponds ? "YA (sehat)" : "TIDAK"}`);
  }
  if (h.note) console.log(`Catatan          : ${h.note}`);

  console.log(`\n=== Katalog Model ===`);
  console.log(`Total model      : ${status.models.total}`);

  console.log(`\n=== Perkiraan Pemakaian Token (1x baca PDF) ===`);
  const e = status.estimatedRead;
  console.log(`Model            : ${e.model}`);
  console.log(`Input token      : ~${e.inputTokens}`);
  console.log(`Output token     : ~${e.outputTokens}`);
  console.log(`Total token      : ~${e.totalTokens}`);
  console.log(`Perkiraan biaya  : ${usd(e.estimatedCostUsd)} per pembacaan`);
  console.log(`Asumsi           : ${e.assumptions}`);

  if (real.ok && real.data) {
    const r = real.data;
    console.log(`\n=== Pemakaian NYATA (dari respons LLM, bukan estimasi) ===`);
    if (r.totals.calls === 0) {
      console.log(`Belum ada panggilan LLM pada sesi ini (jalankan Reader live dulu).`);
    } else {
      console.log(`Jumlah panggilan : ${r.totals.calls}`);
      console.log(`Input token      : ${r.totals.promptTokens}`);
      console.log(`Output token     : ${r.totals.completionTokens}`);
      console.log(`Total token      : ${r.totals.totalTokens}`);
      console.log(`Biaya read terakhir: ${usd(r.lastReadCostUsd)}`);
      console.log(`Total biaya sesi : ${usd(r.totalCostUsd)}`);
      const lastWithId = r.records.filter((x) => x.inferenceId).slice(-1)[0];
      if (lastWithId) console.log(`inference-id terakhir: ${lastWithId.inferenceId} (untuk /v1/billing/costs)`);
    }
  }

  console.log(`\n=== Sisa Usage (balance) ===`);
  if (status.balance.accessible && status.balance.balance) {
    const b = status.balance.balance;
    console.log(`Terpakai         : ${b.total_spent_display}`);
    console.log(`Sisa             : ${b.remaining_display ?? "-"}`);
    console.log(`Batas (limit)    : ${b.spend_limit_display ?? "-"}`);
    console.log(`Total request    : ${b.total_requests}`);
    console.log(`Total token      : ${b.total_tokens}`);
  } else {
    console.log(`Tidak dapat diakses dengan inference key.`);
    console.log(`Alasan           : ${status.balance.reason}`);
  }
  console.log("");
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
