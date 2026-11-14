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

**Pembaca (`agent/reader/`) — U4 hampir selesai, tinggal tes live**
- `pdf.ts` — ekstraksi teks (pdfjs-dist v4, legacy build untuk Node/Vercel) +
  SHA-256 PDF (R12).
- `quotes.ts` — cek kutipan persis setelah normalisasi spasi (R14).
- `llm.ts` — panggilan NEAR AI Cloud (OpenAI-compatible, `https://cloud-api.near.ai/v1`,
  model default `deepseek-ai/DeepSeek-V3.1`, bisa diganti `NEARAI_MODEL`). JSON
  Schema untuk prompt dihasilkan dari `ReaderLLMSchema` via `zod-to-json-schema`,
  jadi prompt & validasi tidak mungkin beda.
- `enrich.ts` — LLM → `ReaderOutput`: bps, akun dari clubs.json, buang klub 0 bps,
  warnings. `enrich.ts` menolak klub yang tidak ada di `clubs.json`.
- `index.ts` — `readPdf(bytes)` → `{ output, pdfHash }`. `DEMO_MODE=true`:
  cocokkan SHA-256 PDF dengan fixture (hash commit, tabel di fixtures/README.md),
  tanpa API key (KTD6). Live: ekstrak → LLM → validasi → enrich.
- `cli.ts` — `npm run reader -w agent -- <pdf>` untuk cek lokal.

**Tes — `npm test -w agent` hijau (26 tes, 3 file)**
- `tests/training.test.ts` — semua kasus bps U4 (12–15=100, 16–23=400, 14–15=50, 24+=0).
- `tests/schema.test.ts` — helper konversi + fixture deal1/deal2 lolos zod & cocok R2/R4.
- `tests/reader.test.ts` — kutipan cocok/mengarang, basis net, jumlah cicilan ≠
  harga, clubs.json hilang, hash demo → fixture, PDF asing ditolak.

**Keputusan (diumumkan ke grup; schema belum beku saat ini, beku Rabu malam):**
1. **Seller/buyer TIDAK masuk schema Pembaca** (tetap 7 field sesuai PLAN.md).
   Pembeli = akun login; penjual dipilih UI / dari `clubs.json` / env demo.
2. **`collateral` opsional** di `ReaderOutputSchema` — deal penjualan ulang
   (Deal 2) memang tanpa jaminan.
3. `trainingClubs` hanya berisi klub penerima royalti (bps > 0); Nordvik IF
   (24+, 0 bps, penjual) dibuang oleh `enrich.ts`.

## Macet

- **Tes live Pembaca belum bisa dijalankan** (butuh `NEARAI_API_KEY` + kontrak
  deployed testnet). Semua logika sudah diuji lewat fungsi murni dan DEMO_MODE.

## Butuh dari orang lain

- **Orang 4 — file `sample-agreements/*.pdf` di working tree ber-CRLF.**
  Ditemukan Rabu: hash SHA-256 PDF di checkout Windows (mis. deal1 =
  `e9972e22…`) **berbeda** dari versi commit/README (deal1 = `eab47557…`).
  `pdf-parse` (pdf.js lama) bahkan salah membaca `deal2.pdf` karena ini.
  Mitigasi di folderku: pembaca memakai `pdfjs-dist` v4 + DEMO_MODE menolak
  hash asing dengan pesan "jalankan `git checkout -- sample-agreements`".
  **Usul ke Orang 4:** tambah `.gitattributes` berisi `*.pdf -text` di root,
  lalu commit ulang PDF versi LF.
- **Orang 1** — nama akun master final untuk mengganti `<master>` di `clubs.json`
  (dan fixture), begitu deploy testnet jalan.
- **Orang 3** — web perlu import `readPdf` dari workspace `agent` (lihat
  `agent/README.md`), tampilkan `warnings` dan blokir "Buat deal" saat ada
  `quote_not_found` (R14). `transpilePackages: ["agent"]` mungkin perlu di
  konfigurasi Next.js.
