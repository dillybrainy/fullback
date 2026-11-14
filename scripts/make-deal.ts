// npm run make:deal -w scripts -- [opsi]
//
// Membuat SATU deal uji di NEAR testnet dengan jatuh tempo yang bebas diatur,
// untuk melihat Collector (`npm run collector`) bekerja. Cicilan TIDAK dibayar
// pembeli, jadi Penagih-lah yang harus menagihnya dari jaminan.
//
// Contoh:
//   npm run make:deal -w scripts -- --due 120            # cicilan 1 jatuh tempo 2 menit lagi
//   npm run make:deal -w scripts -- --due 0              # langsung lewat jatuh tempo
//   npm run make:deal -w scripts -- --due 30 --count 1   # satu cicilan saja
//   npm run make:deal -w scripts -- --due 60 --count 3 --interval 1800
//   npm run make:deal -w scripts -- --due 120 --pay-first  # cicilan 1 dibayar sendiri,
//                                                          # collector menagih cicilan 2
//   npm run make:deal -w scripts -- --pdf ../sample-agreements/tests/OK-01-basic.pdf \
//     --name "Daniel Okoro" --due 86400 --amount 2000000 --count 3
//     # deal yang sidik jarinya = PDF itu, untuk demo halaman Verify
//
// Opsi:
//   --due <detik>       jatuh tempo cicilan 1, dihitung dari sekarang (default 120;
//                       boleh 0 atau negatif = sudah lewat jatuh tempo)
//   --count <n>         jumlah cicilan, minimal 1 (default 2)
//   --interval <detik>  jarak jatuh tempo antar cicilan berikutnya (default 3600)
//   --amount <fEUR>     nominal per cicilan (default 2000000)
//   --collateral <fEUR> jaminan (default = --amount; kontrak menghendaki jaminan
//                       minimal satu cicilan)
//   --pay-first         pembeli langsung membayar cicilan 1 (uji collector pada
//                       cicilan berikutnya)
//   --player <teks>     akhiran player_id (default: collector-test-<timestamp>)
//   --name <teks>       nama pemain yang tampil di UI (default: Collector Test)
//   --pdf <path>        sidik jari deal = SHA-256 file PDF ini (default: sidik
//                       jari perjanjian demo). Untuk demo halaman Verify.
//
// Semua transaksi ditandatangani kunci demo testnet dari .env (penjual =
// nordvik, pembeli = portoalegre). Token fEUR = uang mainan.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  account,
  call,
  env,
  fe,
  fmt,
  payFeur,
  txLink,
} from "./lib/near.js";

const FT = env("FT_ID");
const CONTRACT = env("CONTRACT_ID");
const owner = account("FT_OWNER_ACCOUNT_ID", "FT_OWNER_PRIVATE_KEY");
const seller = account("DEMO_SELLER_ACCOUNT_ID", "DEMO_SELLER_PRIVATE_KEY");
const buyer = account("DEMO_BUYER_ACCOUNT_ID", "DEMO_BUYER_PRIVATE_KEY");
const kota = env("DEMO_ACADEMY_1_ACCOUNT_ID");
const desa = env("DEMO_ACADEMY_2_ACCOUNT_ID");

// Sidik jari PDF hanya disimpan kontrak; untuk deal uji cukup pakai fingerprint
// perjanjian demo (sama dengan run-demo.ts).
const PDF_HASH = "eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

function intArg(name: string, fallback: number): number {
  const raw = arg(name, String(fallback));
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`Nilai --${name} harus bilangan bulat, dapat: "${raw}"`);
    process.exit(1);
  }
  return n;
}

const dueSec = intArg("due", 120);
const count = intArg("count", 2);
const intervalSec = intArg("interval", 3600);
const amountF = intArg("amount", 2_000_000);
const collateralF = intArg("collateral", amountF);
const payFirst = process.argv.includes("--pay-first");
const playerId = arg("player", `collector-test-${Date.now()}`);
const playerName = arg("name", "Collector Test");
const pdfPath = arg("pdf", "");
const pdfHash = pdfPath
  ? createHash("sha256").update(readFileSync(pdfPath)).digest("hex")
  : PDF_HASH;

if (count < 1) {
  console.error("--count minimal 1");
  process.exit(1);
}
if (amountF < 1 || collateralF < 1) {
  console.error("--amount dan --collateral minimal 1");
  process.exit(1);
}

const INSTALLMENT = fe(amountF);
const COLLATERAL = fe(collateralF);

/** Waktu setempat (HH:MM:SS) dari offset detik terhadap sekarang. */
function dueLabel(offsetSec: number): string {
  const at = new Date(Date.now() + offsetSec * 1000);
  return `${at.toLocaleTimeString()} (${offsetSec >= 0 ? "+" : ""}${offsetSec} dtk)`;
}

async function main() {
  console.log(`Deal uji collector — pemain ${playerId}`);
  console.log(`  ${count} cicilan × ${fmt(INSTALLMENT)}, jaminan ${fmt(COLLATERAL)}`);
  console.log(`  jatuh tempo: ${dueLabel(dueSec)}${count > 1 ? ` → lalu tiap ${intervalSec} dtk` : ""}\n`);

  const need = COLLATERAL + INSTALLMENT * BigInt(payFirst ? 2 : 1);
  const minted = await call(owner, FT, "mint", {
    account_id: buyer.accountId,
    amount: need.toString(),
  });
  console.log(`1. Mint ${fmt(need)} ke pembeli\n    ${txLink(minted.hash)}`);

  const created = await call<number>(buyer, CONTRACT, "create_deal", {
    player_id: playerId,
    player_name: playerName,
    seller_id: seller.accountId,
    price: (INSTALLMENT * BigInt(count)).toString(),
    installments: Array.from({ length: count }, (_, i) => ({
      amount: INSTALLMENT.toString(),
      due_offset_sec: dueSec + intervalSec * i,
    })),
    collateral: COLLATERAL.toString(),
    sell_on_bps: 1500,
    sell_on_basis: "gross",
    training_clubs: [
      { account_id: kota, name: "Kota FC", bps: 400 },
      { account_id: desa, name: "Akademi Desa", bps: 100 },
    ],
    pdf_hash: pdfHash,
  });
  const dealId = created.value;
  console.log(`2. Deal ${dealId} dibuat (${fmt(INSTALLMENT * BigInt(count))})\n    ${txLink(created.hash)}`);

  const approved = await call(seller, CONTRACT, "approve_deal", { deal_id: dealId });
  console.log(`3. Penjual menyetujui\n    ${txLink(approved.hash)}`);

  const deposited = await payFeur(buyer, FT, CONTRACT, COLLATERAL, {
    action: "deposit_collateral",
    deal_id: dealId,
  });
  console.log(`4. Jaminan ${fmt(COLLATERAL)} masuk → deal Active\n    ${txLink(deposited.hash)}`);

  if (payFirst) {
    const paid = await payFeur(buyer, FT, CONTRACT, INSTALLMENT, {
      action: "pay_installment",
      deal_id: dealId,
    });
    console.log(`5. Pembeli membayar cicilan 1\n    ${txLink(paid.hash)}`);
  }

  console.log(`
===========================================================
 Deal #${dealId} SIAP (status Active).
 Cicilan berikutnya jatuh tempo: ${dueLabel(dueSec)}${payFirst ? " (sudah dibayar — target collector = cicilan berikutnya)" : " dan TIDAK dibayar pembeli"}.
${count > 1 ? ` Cicilan setelahnya: tiap ${intervalSec} dtk.\n` : ""}
 Jalankan collector untuk menagihnya:

     npm run collector

 Log yang diharapkan setelah jatuh tempo:
     [collector] deal #${dealId} -> PaidFromCollateral (installment #N) | <link>
===========================================================`);
}

main().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
