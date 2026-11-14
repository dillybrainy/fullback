# Progres Orang 2 — Agen AI / backend

## Sabtu 14 Nov — Cadangan & perbaikan (harian Sabtu)

**Perbaikan bug model NEAR AI Cloud (penting, menyangkut demo live)**
- Tes live Reader (`LIVE_TEST=1`) yang lulus pada audit 13 Nov **tiba-tiba gagal**
  pada 14 Nov: `400 Model 'deepseek-ai/DeepSeek-V3.1' not found`. Model default
  di `agent/reader/llm.ts` sudah **dihapus dari katalog NEAR AI Cloud**.
- Ini bukan salah isi perjanjian/kode kita: endpoint-nya yang mengganti daftar
  model. Kalau dibiarkan, Reader live akan crash saat juri/Orang 3 memakainya.
- **Verifikasi, bukan menebak:** ambil daftar model asli dari
  `GET /v1/models`, lalu uji kandidat lewat env `NEARAI_MODEL` tanpa ubah kode.
  Karena Sonnet dinilai terlalu mahal, diuji juga kandidat murah + **stabilitas 3×**
  (lihat `agent/eval/README.md` untuk data penuh):
  - `deepseek/deepseek-v3.2` — valid, tapi **3 kutipan cicilan (pasal 3.2)
    tidak verbatim** → `warnings` terisi (melanggar R14). Ditolak.
  - `openai/gpt-5.4-nano` — lolos 1×, tapi hanya **1/3** saat diulang (flaky). Ditolak.
  - `openai/gpt-5.4-mini` — field **`collateral` hilang**. Ditolak.
  - `anthropic/claude-sonnet-5` — lulus penuh & stabil, tapi **mahal**. Tidak dipakai.
  - `google/gemini-2.5-flash-lite` — **lulus 3/3**, kutipan verbatim, tercepat &
    termurah di kelasnya. **Dipilih.**
- **Perubahan kode:** `DEFAULT_MODEL` di `agent/reader/llm.ts` →
  `google/gemini-2.5-flash-lite` (dipilih lewat pengukuran, bukan ukuran model),
  disertai komentar riwayat alasan penggantian. `NEARAI_MODEL` tetap sebagai override.
- **Data evaluasi lengkap** (metode, uji 1×, uji stabilitas 3×, analisis, keputusan)
  disimpan di `agent/eval/README.md`, file mentah vitest di `agent/eval/raw/`.
  Temuan kunci: `gpt-5.4-nano` lolos 1× tapi flaky 1/3; `gpt-5.4-mini` menghilangkan
  field `collateral`; `deepseek-v3.2` kutipan tidak verbatim. Solusi struktural
  (kutipan diambil kode, bukan model) dicatat sebagai hardening pasca-hackathon.
- **Bukti:** `LIVE_TEST=1 npm test -w agent` → **38 lulus, 0 gagal (5 file)**,
  termasuk 1 tes live yang memvalidasi angka R2/R3 (fee 10.000.000, 4 × 2.500.000,
  collateral 2.500.000, sell-on 1500 bps gross, Kota FC 400 bps, Akademi Desa
  100 bps, `warnings=[]`). `npm run typecheck -w agent` lulus.

**Beres-beris & koordinasi**
- Working tree bersih saat dicek: perubahan lokal audit 13 Nov sudah masuk commit
  (`7a72ffd`/`5379737`), jadi tidak ada yang perlu di-commit tambahan.
- File sementara tes dibersihkan; tidak ada referensi model lama tersisa kecuali
  komentar riwayat di `llm.ts`.
- Untuk Orang 4: konfirmasi `near-api-js` (bukan `near-kit`) — terlihat dari
  `agent/package.json` (`near-api-js: ^7.0.0`). Package `openai` **tidak dipakai**
  (kita `fetch` langsung ke NEAR AI Cloud, OpenAI-compatible). Versi library
  untuk `docs/libraries.md` sudah disiapkan (lihat di bawah).

**Issue #10 dari Orang 1 — hemat allowance kunci Penagih + perbaiki uji agen curang**
- **Margin jam lokal vs waktu blok** (`agent/collector/index.ts`): `tick()` kini
  hanya memanggil `settle_due` kalau `next_due_at_ns + 5 detik < now`
  (`DUE_SAFETY_MARGIN_NS`), dan setelah hasil `NotDue` deal itu diistirahatkan
  ±10 detik (`NOT_DUE_COOLDOWN_NS`, state lintas tick via `createTickState()`).
  Kedua nilai mencegah allowance 2 NEAR terbakar untuk panggilan `NotDue`.
- **Isolasi error per deal**: satu `settle_due` yang gagal (RPC timeout,
  `NotEnoughAllowance`, dll) kini dicatat sebagai `TickEntry.result = "Error"`
  (+ field `error`, `tx_hash`/`explorer_link` null) dan **tidak lagi
  menghentikan deal lain** dalam tick yang sama.
- **`illegal-attempt.ts` tanpa deposit**: `deposit: 1n` dihapus → chain kini
  menolak dengan `AccessKeyReceiverMismatchActionError` ("kunci ini hanya untuk
  kontrak FULLBACK") yang lebih jelas untuk juri, bukan
  `AccessKeyDepositWithFunctionCallActionError`. Sama seperti `run-demo.ts`.
- **Klasifikasi penolakan** (`classifyAttemptError`): hanya error ber-prefix
  `AccessKey` (kelas `near-api-js/rpc-errors`) yang dihitung `outcome:
  "rejected"` / `rejected_by_chain: true`. Error jaringan/env → `outcome:
  "error"` dan CLI sekarang **exit 1** (dulu mencetak ✓ untuk semua error).
  Transaksi ditolak sebelum masuk blok → `explorer_link` selalu null untuk
  hasil "rejected"; web (Orang 3, langkah "Coba agen curang") **jangan menunggu
  link explorer** untuk langkah ini.
- **Bukti:** `npm test -w agent` → **49 lulus, 0 gagal (6 file)** — 12 tes baru
  (margin, cooldown NotDue, isolasi error, entri Error, klasifikasi
  `illegal-attempt` memakai kelas error asli `near-api-js/rpc-errors`).
  `npm run typecheck -w agent` lulus. `schema.ts` tidak diubah (tetap beku;
  `TickEntry` memang bukan bagian schema Pembaca).

**Beres-beres `sample-agreements/` (diarahkan user, folder Orang 4)**
- Isi root `sample-agreements/` dihapus semua — hanya `tests/` (19 PDF uji
  Pembaca + `make_tests.py` + `manifest.json` + README) yang dipertahankan
  sebagai kontrak PDF yang dipakai. Terhapus: deal0/deal1/deal2 (.pdf/.md),
  dua PDF TAMPERED, `make_agreements.py`, `make_santos.py`, README root +
  README-deal0, `.gitkeep`. Semua masih bisa dipulihkan dari git history
  (commit `f741c98`/`dc03e4d`) sebelum di-commit.
- `npm test -w agent` tetap 49 lulus (tes tidak membaca PDF root saat runtime).
- **Tindak lanjut (15 Nov):** referensi di `agent/` sudah dirapikan —
  `reader-live.test.ts` kini membaca blob dari commit `f741c98` (dipin, hash
  terverifikasi `eab47557…`), pesan DEMO_MODE + `fixtures/README.md` +
  `agent/README.md` + contoh CLI menunjuk cara restore dari git history, dan
  contoh perintah memakai `sample-agreements/tests/OK-01-basic.pdf`.
  Issue untuk pemilik folder lain: **#16** (Orang 1 — `scripts/run-demo.ts`
  membaca deal1 yang terhapus) dan **#15** (Orang 4 — README root, PLAN.md
  AE3/U6, `docs/submit-checklist.md`, `docs/PANDUAN-PEMULA.md`,
  `docs/libraries.md`, baris usang di `tests/README.md`, plus todo
  `.gitattributes *.pdf -text`).

**Issue #4 — uji on-chain testnet (15 Nov, setelah deploy Orang 1)**
- ✅ `<master>` sudah diganti di `clubs.json` + `fixtures/*.json` (→
  `*.fullback-team.testnet`) — sudah benar sebelum dicek, tidak diubah.
- ✅ `illegal-attempt` live: **ditolak chain** dengan
  `AccessKeyReceiverMismatchActionError` (receiver mismatch, sesuai desain #10;
  tanpa link explorer karena ditolak sebelum masuk blok).
- ✅ `tick()` Collector live: `settle_due` deal #0 cicilan #2 → `Defaulted`
  (tx `HG53tgp9dNP2zif4Ma5bd3eC4hUmrChCDURAwuJjjthM`), tick lanjutan bersih —
  margin 5 dtk + cooldown NotDue bekerja tanpa panggilan sia-sia. Skenario
  persis "cicilan 2 Deal 1 dibayar dari jaminan" masih menunggu Deal 1 dibuat
  (cerita `npm run demo`).
- ✅ Tes live Reader lulus (R2/R3 + `warnings=[]`, blob `f741c98`).
- ✅ Tidak ada kunci privat di repo (`.env` ter-gitignore, file lain placeholder).
- **Bug ditemukan + diperbaiki:** env dengan nilai string kosong (mis.
  `LLM_API_KEY=` / `NEAR_RPC_URL=` dari `.env.example`) mematikan fallback
  `??` → tes live salah lapor "API key tidak disetel" dan `illegal-attempt`
  gagal "Failed to parse URL". Diperbaiki di `agent/config.ts` (env kosong =
  tidak disetel), `collector/index.ts`, `collector/illegal-attempt.ts`;
  tes regresi baru `tests/config.test.ts` (7 tes). Total **56 tes lulus**.
- **Sinkronisasi dokumen instruksi agent (15 Nov):** `agent/README.md` —
  akun master sudah konkret (`<master>` tidak dipakai lagi), ditambah seksi
  baru **"Penagih (Collector) & demo kunci terbatas"** (env, disiplin
  allowance, bentuk `IllegalAttemptResult` untuk web Fase 2, status bukti
  on-chain); jumlah tes tanpa angka kaku. `agent/fixtures/README.md` —
  konvensi akun diperbarui. `docs/PANDUAN-PEMULA.md` §8 — perintah Reader
  memakai `tests/OK-01` (live) atau restore PDF demo dari `f741c98` (demo);
  seksi Collector tidak lagi "belum diimplementasikan"; prioritas Orang 2
  diperbarui. `docs/libraries.md` — baris reportlab → `tests/make_tests.py`.
  Path PDF di `agent/tests/reader-http.test.ts` (WIP Reader HTTP) disamakan
  ke blob `f741c98` — tesnya lulus 6/6. Total tes kini **62 lulus**.
- **Migrasi fixture ke PDF `tests/` (15 Nov, sesuai arahan user):** fixture
  kini `{ pdfHash, output }` yang memetakan `tests/OK-01-basic.pdf` (deal1,
  Daniel Okoro 6M = 3×2M) dan `tests/OK-02-unequal-installments.pdf` (deal2,
  10M = 4+3+3). Yang disesuaikan: `reader/index.ts` (peta hash → `fixture.output`),
  `reader-live.test.ts` (menguji OK-01 via pipeline live, lulus 60 dtk,
  `warnings=[]`), `reader.test.ts` + `schema.test.ts` + `reader-http.test.ts`
  (angka & hash baru), `fixtures/README.md` ditulis ulang. **Hash fixture =
  hash manifest = hash commit** (byte PDF dinormalkan ulang ke LF; ternyata
  `.gitattributes` `*.pdf binary` sudah ada sejak PR #14 — tidak perlu ditambah).
  Total tes **71 lulus** termasuk 1 live.

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

**Tes — `npm test -w agent` hijau (26 tes, 3 file saat Rabu 11 Nov; menjadi 38 tes, 5 file per 14 Nov setelah Collector + live test masuk)**
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

- **Tidak ada yang macet di sisi kode.** Catatan lama soal "live test terblokir
  402" sudah **tidak berlaku**: tes live Reader **lulus 14 Nov** (lihat atas).
  Satu-satunya yang tersisa bergantung pada **deploy testnet + akun master dari
  Orang 1** (di luar folder `agent/`):
  - Ganti placeholder `<master>` di `clubs.json` + `fixtures/*.json`.
  - Uji Collector (`tick()` → `settle_due`) dan `illegal-attempt.ts` di testnet
    (AE4/R13) — butuh kontrak yang sudah di-deploy + kunci keeper.

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

## Minggu 15 Nov — uji live Reader pada 19 PDF tes

Uji live (NEAR AI Cloud, `google/gemini-2.5-flash-lite`) ke semua PDF di
`sample-agreements/tests/`. Sebelum perbaikan, 15/19 gagal dengan
`Unknown training club "Harbour City FC"`: penjual ada di Annex A dan prompt
menyuruh mengambil semua baris. Diperbaiki:

- Penjual/pembeli tidak pernah masuk `trainingClubs` (prompt + cek kode
  `isPartyName`; kontrak juga menolaknya).
- Cek nilai baru (`findUnsupportedValues`): nominal & persen harus tertulis di
  kutipannya, tanggal harus tertulis di PDF. Menangkap tanggal lahir karangan
  (BAD-05) walau kutipannya asli. Kode warning tetap `quote_not_found`
  (schema tidak berubah).
- Prompt: pasal "Notwithstanding" diikuti, nilai yang tidak ada tidak dikarang,
  kutipan cicilan tanpa tanggal (model selalu menyambung "each, due on <tgl>").

Hasil: 7/7 OK tanpa warning, 7/7 BAD ketahuan (warning atau error validasi),
4 GAP lolos sesuai perkiraan, Deal 1 Lucas live 3/3 lulus. Unit test 69 lulus.
`tests/reader-http.test.ts` kini membaca PDF Deal 1 dari git history.

## Minggu 15 Nov (lanjutan) — Reader pindah ke model private TEE

Default Reader sekarang `Qwen/Qwen3.6-35B-A3B-FP8` (private, TEE NEAR AI Cloud,
attestation OK) dengan thinking dimatikan. Hasilnya 15/15 PDF tes ×4 run, Deal 1
12/12, ±2 dtk per PDF, $0,001 per PDF. Gemini lama ternyata external provider
(bukan TEE). GLM-5.3-flash dan Qwen3.8-27B ditolak karena terlalu lambat
(30–90 dtk). Detail di `agent/eval/README.md` §7.

**Untuk Orang 3 / Vercel:** tidak ada env baru yang wajib. `NEARAI_MODEL`
dikosongkan saja, supaya default dari kode yang dipakai.
