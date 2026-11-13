# Progres Orang 2 — Agen AI / backend

## Selesai

### Rabu 11 Nov — Interface dibekukan + Pembaca inti

**Interface (`agent/schema.ts`, `agent/fixtures/`)**
- `schema.ts` — Zod `ReaderLLMSchema` + `ReaderOutputSchema` persis "Bentuk JSON
  Pembaca" di PLAN.md. Uang fEUR utuh, konversi ke U128 lewat `eurToSmallestUnit()`.
  `trainingClubs[].bps` & `sellOn.bps` dihitung kode, bukan LLM (KTD5).
  `warnings[]` untuk kutipan tak cocok / basis net / jumlah cicilan ≠ harga (R14).
- `fixtures/deal1.json` — Deal 1 persis R2/R3 (10.000.000, 4 × 2.500.000, jaminan
  2.500.000, sell-on 15% gross, Kota FC 400 bps + Akademi Desa 100 bps).
- `fixtures/deal2.json` — Deal 2 persis R4 (20.000.000 sekali bayar, tanpa
  `collateral`, sell-on 15% gross).
- `clubs.json` — nama klub → akun testnet (placeholder `<master>`).
- `training.ts` — bps dari riwayat umur (25 bps/thn umur 12–15, 50 bps/thn umur
  16–23, maks 500), bukan dari LLM (KTD5).

**Pembaca (`agent/reader/`)**
- `pdf.ts` — ekstraksi teks (pdfjs-dist v4, legacy build untuk Node/Vercel) +
  SHA-256 PDF (R12).
- `quotes.ts` — cek kutipan persis setelah normalisasi spasi (R14).
- `llm.ts` — panggilan NEAR AI Cloud (OpenAI-compatible, `https://cloud-api.near.ai/v1`,
  model default `google/gemini-2.5-flash`, bisa diganti `NEARAI_MODEL`). JSON
  Schema untuk prompt dihasilkan dari `ReaderLLMSchema` via `zod-to-json-schema`,
  jadi prompt & validasi tidak mungkin beda.
- `enrich.ts` — LLM → `ReaderOutput`: bps, akun dari clubs.json, buang klub 0 bps,
  warnings. `enrich.ts` menolak klub yang tidak ada di `clubs.json`.
- `index.ts` — `readPdf(bytes)` → `{ output, pdfHash }`. `DEMO_MODE=true`:
  cocokkan SHA-256 PDF dengan fixture (hash commit, tabel di fixtures/README.md),
  tanpa API key (KTD6). Live: ekstrak → LLM → validasi → enrich.
- `cli.ts` — `npm run reader -w agent -- <pdf>` untuk cek lokal (membaca `.env` root).

**Tes — `npm test -w agent` hijau (26 tes, 3 file)**
- `tests/training.test.ts` — semua kasus bps U4 (12–15=100, 16–23=400, 14–15=50, 24+=0).
- `tests/schema.test.ts` — helper konversi + fixture deal1/deal2 lolos zod & cocok R2/R4.
- `tests/reader.test.ts` — kutipan cocok/mengarang, basis net, jumlah cicilan ≠
  harga, clubs.json hilang, hash demo → fixture, PDF asing ditolak.

### Keputusan interface — DITETAPKAN, disetujui semua (Rabu 11 Nov malam)

Tiga keputusan yang tadinya kutunggu sudah **disetujui keempat anggota** lewat
perwakilan Orang 2 (user). `agent/schema.ts` sekarang resmi beku:

1. **Seller/buyer TIDAK masuk schema Pembaca** (tetap 7 field sesuai PLAN.md).
   Pembeli = akun login; penjual dipilih UI / dari `clubs.json` / env demo.
2. **`collateral` opsional** di `ReaderOutputSchema` — deal penjualan ulang
   (Deal 2) memang tanpa jaminan.
3. `trainingClubs` hanya berisi klub penerima royalti (bps > 0); Nordvik IF
   (24+, 0 bps, penjual) dibuang otomatis oleh `enrich.ts`.

### Jawaban untuk catatan orang lain

- **Orang 4** (dari `orang-4.md`): fixture `deal1.json` sudah memakai
  **Lucas Andrade**, lahir **2001-03-14** (14 March 2001) sesuai PDF. Kutipan
  semua sudah dicek terhadap PDF asli (pdfjs-dist v4): semua cocok. Versi library
  untuk `docs/libraries.md` ada di bagian "Untuk Orang 4" di bawah.
- **Orang 1** (dari `orang-1.md`): `INTERFACE.md` **disetujui** Orang 2. Penagih
  (U5) akan membaca `get_deal` dulu dan hanya memanggil `settle_due` kalau
  `status == "Active"` dan `next_due_at_ns` sudah lewat (allowance 2 NEAR).

## Macet

- **Tes live Pembaca menunggu API key berkredit dari NEAR Builders.**
  `LIVE_TEST=1 npm test -w agent` dengan key `cloud.near.ai` → **402 "No spending
  limit configured"** (autentikasi berhasil; akun tanpa kredit). Solusi resmi
  (HACKATHON.md Q-000): daftar NEAR Builders (nearbuilders.org/join) → klaim
  **$10 kredit** di dashboard → dapat **API key terpisah** → isi `NEARAI_API_KEY`
  di `.env` dengan key itu. API-nya tetap NEAR AI Cloud (`cloud-api.near.ai/v1`),
  kode tidak berubah. Tes integrasi: `agent/tests/reader-live.test.ts` (di-skip
  otomatis kalau `LIVE_TEST`/`NEARAI_API_KEY` tidak diisi).
- **Model default diganti** ke `google/gemini-2.5-flash` karena
  `deepseek-ai/DeepSeek-V3.1` sudah tidak ada di katalog `GET /v1/models`.
- Kontrak testnet belum deployed (menunggu akun master Orang 1), jadi integrasi
  on-chain belum bisa dicoba.

## Butuh dari orang lain

### Untuk Orang 4
1. **PDF `sample-agreements/*.pdf` di checkout Windows jadi CRLF** → hash SHA-256
   beda dari README (`deal1` working tree = `e9972e22…`, README/commit = `eab47557…`).
   **Minta:** tambah `.gitattributes` berisi `*.pdf -text` di root, lalu commit ulang
   PDF versi LF. Tanpa ini, fitur Sidik Jari (R12) berisiko: PDF yang di-upload juri
   bisa beda byte dengan yang dipakai saat `create_deal`. DEMO_MODE-ku menolak hash
   asing dengan pesan jelas sebagai mitigasi.
2. **Versi library untuk `docs/libraries.md`** (milikku, `agent/`):
   | Library | Versi | Lisensi | Catatan |
   |---|---|---|---|
   | near-api-js | ^7.0.0 | MIT | dipakai Penagih (U5) |
   | zod | ^3.23.8 (terpasang 3.25.76) | MIT | `agent/schema.ts` |
   | pdfjs-dist | 4.10.38 | Apache-2.0 | ekstraksi teks PDF; legacy build Node |
   | zod-to-json-schema | 3.24.5 | MIT | JSON Schema untuk prompt LLM |
   | Vitest | ^2.1.0 | MIT | tes `agent/tests/` |
   | tsx | ^4.19.0 | MIT | menjalankan TS (CLI reader/collector) |
   | TypeScript | ^5.6.0 | Apache-2.0 | seluruh `agent/` |
   | dotenv | ^16.4.5 | BSD-2 | membaca `.env` di CLI |
   - **`openai` TIDAK dipakai** — NEAR AI Cloud dipanggil lewat `fetch` biasa
     (API OpenAI-compatible), jadi baris "openai [cek]" bisa dihapus.
   - **Ekstraksi PDF: `pdfjs-dist` v4**, bukan `pdf-parse`. `pdf-parse` (pdf.js
     v1.10, 2016) terbukti salah membaca `deal2.pdf` (mengembalikan teks Deal 1).

### Untuk Orang 1
- Setujuan INTERFACE dari kami sudah kuberikan di atas.
- **Setelah deploy testnet:** kirim nama akun master (mis. `fullback-demo.testnet`)
  → aku ganti `<master>` di `clubs.json` + fixture jadi akun asli.
- Untuk Penagih (U5): butuh `KEEPER_ACCOUNT_ID` + `KEEPER_PRIVATE_KEY` (kunci
  terbatas `settle_due`) dari `scripts/.env.demo` begitu setup-demo jalan.

### Untuk Orang 3
- Web memakai Pembaca lewat `import { readPdf } from "agent/reader"` (lihat
  `agent/README.md`): kembalian `{ output, pdfHash }`. Pakai `pdfHash` untuk
  `create_deal` dan Verifikasi, **jangan hash ulang di browser**.
- Tampilkan `warnings[]`; blokir tombol "Buat deal" saat ada `quote_not_found`
  sampai manusia konfirmasi (R14).
- `transpilePackages: ["agent"]` mungkin perlu di `next.config` karena workspace
  berisi TypeScript mentah (Next 15 biasanya sudah otomatis).
- Placeholder `<master>` di `trainingClubs[].account` → ganti dengan akun master
  asli (dari `CONTRACT_ID`, strip prefix `fullback.`).
- Env Vercel: `NEARAI_API_KEY` (live) atau `DEMO_MODE=true` (fixture).
