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
- Akun di `trainingClubs[].account` memakai placeholder `<master>`; web mengganti
  `<master>` dengan nama akun master asli (bisa diambil dari `CONTRACT_ID`:
  `fullback.<master>.testnet` → strip prefix `fullback.`).

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
- Default: **`google/gemini-2.5-flash-lite`** — dipilih lewat pengukuran (lulus 3/3
  pada tes live, termurah/tercepat di kelasnya), bukan karena ukuran. Ganti tanpa
  ubah kode lewat env `NEARAI_MODEL`.
- Catatan penting: model default lama (`deepseek-ai/DeepSeek-V3.1`) dihapus dari
  katalog NEAR AI Cloud sehingga Reader sempat crash pada 14 Nov. Hasil evaluasi
  pemilihan model + file mentah ada di [`eval/README.md`](eval/README.md).
- Biaya saat demo juri = **$0** (DEMO_MODE memakai fixture, tanpa panggilan LLM).

## Cara cek lokal

```bash
npm test -w agent                      # 38 tes: schema, training, reader, collector
LIVE_TEST=1 npm test -w agent -- tests/reader-live.test.ts   # tes live (butuh API key)
npm run reader -w agent -- <file.pdf>  # cetak hasil Pembaca (DEMO_MODE dari .env)
```

## Catatan penting

- **Library PDF:** `pdfjs-dist` v4 (legacy build untuk Node/Vercel). `pdf-parse`
  (pdf.js v1.10, 2016) salah membaca `deal2-portoalegre-clubz.pdf` — jangan dipakai.
- **Hash PDF sensitif line ending.** PDF di folder `sample-agreements/` yang
  di-checkout di Windows (CRLF) punya SHA-256 berbeda dari versi commit (LF).
  Selalu pakai versi commit: `git checkout -- sample-agreements`. Sudah diteruskan
  ke Orang 4 (perlu `.gitattributes` `*.pdf -text`).
- **Penjual/pembeli bukan output Pembaca.** Pembeli = akun yang login; penjual
  dipilih di UI / dari `clubs.json` / env demo. Schema tidak diubah (sesuai PLAN.md).
- `schema.ts` **dibekukan Rabu 11 Nov malam**. Perubahan butuh persetujuan 4 orang.
