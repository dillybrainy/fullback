# Agent — Orang 2 (AI agents / backend)

Isi `agent/`: Pembaca (Reader) dan (Jumat) Penagih (Collector). Dokumen ini ringkasan
untuk Orang 3 (web) dan skrip yang memakai workspace ini.

## Apa yang diekspor untuk web

```ts
import { readPdf } from "agent/reader"; // atau "agent/reader/index.js"
const { output, pdfHash } = await readPdf(pdfBytes);
```

- `output` — `ReaderOutput` (bentuk final di `agent/schema.ts`, sesuai PLAN.md).
  Uang dalam fEUR utuh; `sellOn.bps` dan `trainingClubs[].bps` sudah basis points.
- `pdfHash` — SHA-256 hex (huruf kecil) dari byte PDF persis, untuk `create_deal`
  (`pdf_hash`) dan halaman Verifikasi (R12). **Jangan hash ulang di web**; pakai
  nilai ini supaya sidik jari yang tersimpan on-chain pasti cocok.
- Akun di `trainingClubs[].account` sudah konkret: `*.fullback-team.testnet`
  (nama master deploy testnet; placeholder `<master>` diganti sejak issue #4).
  Web tidak perlu mengganti apa pun. Bila proyek pindah akun master, ganti
  di `agent/clubs.json` + `agent/fixtures/*.json` sekaligus.

## Mode

| Mode | Syarat | Perilaku |
|---|---|---|
| `DEMO_MODE=true` (default `.env.example`) | tanpa API key, tanpa jaringan | PDF dicocokkan SHA-256-nya dengan fixture (`deal1.json`, `deal2.json`). PDF lain ditolak dengan pesan jelas. |
| Live | `NEARAI_API_KEY` di env | teks PDF → NEAR AI Cloud → validasi zod → cek kutipan → enrich |

`warnings[]` harus ditampilkan web; kalau ada `quote_not_found` / `sell_on_net` /
`installments_mismatch`, tombol "Buat deal" dinonaktifkan sampai manusia konfirmasi (R14).

## Model NEAR AI Cloud

- Endpoint OpenAI-compatible: `https://cloud-api.near.ai/v1` (`fetch` langsung,
  **bukan** package `openai`).
- Default (sejak 15 Nov): **`Qwen/Qwen3.6-35B-A3B-FP8`**, model **private** yang
  jalan di TEE NEAR AI Cloud (Intel TDX + GPU NVIDIA, punya attestation). Lulus
  15/15 PDF tes ×4 run dan Deal 1 12/12, ±2 dtk per PDF, ±$0,001 per PDF.
  Mode "thinking" Qwen3 dimatikan otomatis (`config.ts`); override lewat env
  `LLM_EXTRA_BODY`. Ganti model tanpa ubah kode lewat `LLM_MODEL`/`NEARAI_MODEL`.
- Default lama `google/gemini-2.5-flash-lite` masih lulus semua tes, tapi itu
  *external provider* (bukan TEE, teks PDF dikirim ke Google). Pakai hanya sebagai
  cadangan.
- Catatan penting: model default lama (`deepseek-ai/DeepSeek-V3.1`) dihapus dari
  katalog NEAR AI Cloud sehingga Reader sempat crash pada 14 Nov. Hasil evaluasi
  pemilihan model + file mentah ada di [`eval/README.md`](eval/README.md).
- Biaya saat demo juri = **$0** (DEMO_MODE memakai fixture, tanpa panggilan LLM).

## Ganti model & provider saat testing (mis. NVIDIA NIM)

Reader memakai API **OpenAI-compatible**, jadi bisa diarahkan ke provider mana pun
(NEAR AI Cloud, NVIDIA NIM, OpenAI, OpenRouter, model lokal) **tanpa ubah kode** —
cukup ganti **3 env var** di `.env`. Logikanya ada di `agent/config.ts`, dan URL
sudah dinormalisasi (tulis dengan atau tanpa `/v1` hasilnya sama).

| Env var | Fallback lama | Arti |
|---|---|---|
| `LLM_API_BASE_URL` | `NEARAI_API_BASE_URL` | Base URL provider (tanpa/dengan `/v1` bebas) |
| `LLM_API_KEY` | `NEARAI_API_KEY` | API key provider |
| `LLM_MODEL` | `NEARAI_MODEL` | Model ID, mis. `meta/llama-3.3-70b-instruct` |

Nilai env yang **kosong** di `.env` (mis. `LLM_API_KEY=`) dianggap tidak
disetel dan tetap jatuh ke fallback/default — jadi aman menyalin `.env.example`
apa adanya.

### Contoh siap salin: NVIDIA NIM

```bash
# .env — ganti 3 baris ini untuk pindah ke NVIDIA NIM
LLM_API_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=nvapi-xxxxxxxxxxxxxxxx        # dari https://build.nvidia.com/settings
LLM_MODEL=meta/llama-3.3-70b-instruct
DEMO_MODE=false                            # wajib false supaya benar-benar memanggil LLM
```

- **Base URL:** `https://integrate.api.nvidia.com/v1` (OpenAI-compatible).
- **API key:** `nvapi-...` dari <https://build.nvidia.com/settings> — gratis (±1000
  kredit, tanpa kartu kredit). Satu key berlaku untuk semua model di katalog.
- **Model ID** (slug bernamespace) — lihat di halaman model di build.nvidia.com:
  - `meta/llama-3.3-70b-instruct` · `meta/llama-3.1-8b-instruct`
  - `deepseek-ai/deepseek-r1` · `deepseek-ai/deepseek-v4-flash`
  - `qwen/qwen2.5-coder-32b-instruct` · `openai/gpt-oss-20b`
  - `nvidia/llama-3.1-nemotron-70b-instruct`

### Provider lain (umum)

```bash
# OpenAI
LLM_API_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini

# Model lokal (Ollama / vLLM / NIM self-hosted)
LLM_API_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=apa-boleh-kosong
LLM_MODEL=llama3.1
```

### Cek cepat setelah ganti

```bash
npm run usage:read -w agent -- ../sample-agreements/tests/OK-01-basic.pdf
# -> harus memanggil provider baru & menampilkan pemakaian token NYATA + inference-id
```

### ⚠️ Peringatan penting (jujur)

- **Yang lintas-provider hanya Reader (chat `/v1/chat/completions`).** Modul
  monitoring `agent/usage/` (`/v1/health`, `/v1/model/list`, `/v1/billing/costs`,
  balance) itu **khas NEAR AI Cloud** — endpoint-nya **tidak ada** di NVIDIA NIM /
  OpenAI. Saat base URL diarahkan ke non-NEAR, `npm run usage` akan menampilkan
  error "HTTP 404/401" **secara graceful** (tidak crash) — itu normal, bukan bug.
  Kembali ke `https://cloud-api.near.ai/v1` bila ingin monitoringnya jalan lagi.
- **Ganti URL + KEY + MODEL bersama-sama.** Karena key dikirim ke base URL, kalau
  ganti URL ke provider lain tapi lupa ganti key, key-mu ikut terkirim ke endpoint
  yang salah. Selalu tiganya sekaligus.
- **Key tidak pernah di-hardcode**, hanya di `.env` (lihat `agent/config.ts`).
- **Uji kualitas kutipan (R14) tetap berlaku untuk model apa pun.** Bukan semua
  model patuh menyalin kutipan verbatim — lihat [`eval/README.md`](eval/README.md).
  Setelah ganti model, jalankan `LIVE_TEST=1 npm test -w agent -- tests/reader-live.test.ts`
  untuk memastikan angka R2/R3 + `warnings=[]` tetap terpenuhi.

## Penagih (Collector) & demo kunci terbatas

`agent/collector/` berisi Penagih (`tick()`, dijalankan `npm run collector`) dan
demo agen curang (`illegal-attempt.ts`, dipakai tombol "Coba agen curang"
Fase 2 lewat route server web).

**Env:** `CONTRACT_ID`, `KEEPER_ACCOUNT_ID`, `KEEPER_PRIVATE_KEY` (wajib),
`NEAR_RPC_URL` (opsional; default `https://test.rpc.fastnear.com`). Kunci
Penagih = function-call access key yang **hanya** boleh memanggil `settle_due`
di kontrak FULLBACK, allowance 2 NEAR (±130 panggilan).

**Disiplin allowance (issue #10):**

- `tick()` membaca `list_deals` (view, gratis) lebih dulu; `settle_due` hanya
  untuk deal `Active` yang `next_due_at_ns` sudah lewat **+ margin 5 detik**
  (`DUE_SAFETY_MARGIN_NS` — jam lokal bisa lebih cepat dari waktu blok).
- Setelah hasil `NotDue`, deal itu diistirahatkan ±10 detik
  (`NOT_DUE_COOLDOWN_NS`, state lintas tick via `createTickState()`).
- Satu `settle_due` yang gagal **tidak** menghentikan tick: dicatat sebagai
  `TickEntry.result: "Error"` (+ field `error`, `tx_hash`/`explorer_link`
  `null`), deal lain tetap diproses.

**Bentuk hasil `tryIllegalTransfer()` (untuk web Fase 2):**

```ts
outcome: "rejected" | "accepted" | "error";
rejected_by_chain: boolean;   // true hanya untuk "rejected"
error: string;                // pesan mentah RPC
error_kind: string | null;    // mis. "AccessKeyReceiverMismatchActionError"
explorer_link: string | null; // SELALU null untuk "rejected"
```

Hanya `outcome: "rejected"` (error ber-prefix `AccessKey` dari
`near-api-js/rpc-errors`) yang boleh ditampilkan sebagai "agen curang ditolak".
Transaksi ditolak **sebelum masuk blok** → tidak ada tx hash / link explorer;
web jangan menunggu link untuk langkah ini. `outcome: "error"` (jaringan/env)
bukan penolakan — jangan tampilkan centang.

**Status bukti on-chain (15 Nov, testnet `fullback-team`):** `illegal-attempt`
ditolak chain dengan `AccessKeyReceiverMismatchActionError`; `tick()` live
memanggil `settle_due` deal #0 (tx `HG53tgp9…`) → `Defaulted`, tick lanjutan
bersih tanpa panggilan sia-sia.

## Cara cek lokal

```bash
npm test -w agent                      # 69 tes: schema, training, reader, collector, http
LIVE_TEST=1 npm test -w agent -- tests/reader-live.test.ts   # tes live (butuh API key)
npm run reader -w agent -- <file.pdf>  # cetak hasil Pembaca (DEMO_MODE dari .env)
npm run collector                      # Penagih live, tick tiap 15 dtk (Ctrl+C berhenti)
npx tsx agent/collector/illegal-attempt.ts  # demo kunci terbatas: wajib ditolak chain
```

## Catatan penting

- **Library PDF:** `pdfjs-dist` v4 (legacy build untuk Node/Vercel). `pdf-parse`
  (pdf.js v1.10, 2016) salah membaca `deal2-portoalegre-clubz.pdf` — jangan dipakai.
  (PDF demo Lucas kini hanya di git history, commit `f741c98`.)
- **Hash PDF sensitif line ending.** PDF yang di-checkout di Windows (CRLF)
  punya SHA-256 berbeda dari versi commit (LF). Selalu pakai versi commit:
  `git checkout f741c98 -- sample-agreements/deal1-nordvik-portoalegre.pdf`.
  Sejak 15 Nov `sample-agreements/` hanya berisi `tests/` (hash versi commit ada
  di `tests/manifest.json`). `.gitattributes` `*.pdf -text` di root masih perlu
  (sudah diteruskan ke Orang 4).
- **Penjual/pembeli bukan output Pembaca.** Pembeli = akun yang login; penjual
  dipilih di UI / dari `clubs.json` / env demo. Schema tidak diubah (sesuai PLAN.md).
- `schema.ts` **dibekukan Rabu 11 Nov malam**. Perubahan butuh persetujuan 4 orang.
