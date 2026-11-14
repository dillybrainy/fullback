# Fixtures (Orang 2)

**Kunci jawaban Pembaca** untuk PDF demo, dipakai saat `DEMO_MODE=true` (tanpa API
key, tanpa LLM, biaya $0) dan sebagai acuan tes.

## Format setiap file

```json
{
  "pdfHash": "<sha256 hex huruf kecil dari byte PDF persis>",
  "output": { "...ReaderOutput (agent/schema.ts, lolos zod)..." }
}
```

- `pdfHash` — sidik jari byte PDF; kunci pencocokan DEMO_MODE.
- `output` — bentuk `ReaderOutput` persis seperti yang dihasilkan Pembaca live.

## Isi (per 15 Nov)

| File | PDF sumber | Isi jawaban |
|---|---|---|
| `deal1.json` | `sample-agreements/tests/OK-01-basic.pdf` | Pemain **Daniel Okoro** (lahir 09-08-2004). Fee **6.000.000** = 3 × 2.000.000 (jatuh tempo 1 Apr, 1 Jul, 1 Okt 2026). Jaminan 2.000.000. Sell-on **10% gross** (1000 bps). Pembinaan: Akademi Desa 12–15 (2016–2019) **100 bps** + Kota FC 16–20 (2020–2024) **250 bps**. `warnings: []` |
| `deal2.json` | `sample-agreements/tests/OK-02-unequal-installments.pdf` | Daniel Okoro. Fee **10.000.000** dengan cicilan **tidak sama**: 4.000.000 + 3.000.000 + 3.000.000 (1 Apr, 1 Jul, 1 Okt 2026). Jaminan 3.000.000. Sell-on 10% gross. Klub pembina sama dengan deal1. `warnings: []` |

Hash byte saat ini (working tree): `OK-01-basic.pdf` = `994899a5…` (→ `deal1.json`),
`OK-02-unequal-installments.pdf` = `45c251e7…` (→ `deal2.json`) — keduanya sama
dengan `pdfHash` di dalam fixture masing-masing.

## Konvensi

- `output` persis `ReaderOutput` dari `agent/schema.ts` (lolos zod).
- **Uang dalam fEUR utuh** (1 fEUR = €1), bukan satuan terkecil. Konversi ke U128
  lewat `eurToSmallestUnit()` di `schema.ts`.
- `sellOn.bps` dan `trainingClubs[].bps` dalam basis points (1 bps = 0,01 %).
  Contoh: 10% = 1000 bps; 1,00% = 100 bps.
- `trainingClubs` hanya berisi klub penerima royalti (bps > 0). Klub dengan
  0 bps **tidak** ikut (penyaringan oleh `enrich.ts`, bukan web).
- `account` sudah konkret: `*.fullback-team.testnet` (prefix `nordvik`,
  `portoalegre`, `clubz`, `kotafc`, `akademidesa` — mengikuti
  `scripts/setup-demo.ts`). Web tidak perlu mengganti apa pun saat runtime.
- `quote` adalah teks persis dari PDF (ASCII, spasi dinormalisasi) — dipakai
  untuk verifikasi R14 (angka harus bisa dikutip dari dokumen).

## Pencocokan hash di DEMO_MODE

`reader/index.ts` mencocokkan SHA-256 PDF yang diunggah dengan `pdfHash` fixture.
Kalau cocok → `output` langsung dikembalikan tanpa memanggil LLM.

### Hash sudah dinormalkan (15 Nov)

`pdfHash` fixture kini **sama dengan hash versi commit** di
`sample-agreements/tests/manifest.json`. Repo sudah punya `.gitattributes`
`*.pdf binary` (PR #14) yang mencegah checkout mengubah byte PDF — jadi hash
ini berlaku di semua mesin:

| PDF | `pdfHash` fixture = hash manifest = hash file |
|---|---|
| `OK-01-basic.pdf` | `1340d083678a312547b454050f3d4d5246f34deacc641c428ee36bb2c1d3bf88` |
| `OK-02-unequal-installments.pdf` | `dc12f270a006a194ffa00e7dcc955b93ed3c9c3abb5c1a5944af1ee3d5bb816f` |

Kalau suatu saat hash tidak cocok, cek `git ls-files --eol
"sample-agreements/tests/*.pdf"` (target `w/lf`) dan pulihkan byte commit —
jangan buru-buru mengubah fixture.

## Catatan integrasi (status 15 Nov — sudah beres)

- `reader/index.ts` memetakan `fixture.pdfHash` → `fixture.output` (bentuk
  fixture bersarang `{ pdfHash, output }`) — sudah disesuaikan.
- `reader-live.test.ts` kini menguji `tests/OK-01-basic.pdf` (sumber deal1)
  dengan pipeline LLM sungguhan dan mem-assert angka fixture + `warnings=[]`.

## Riwayat

Sebelum 15 Nov, fixture berisi jawaban PDF demo Lucas (PLAN.md R1–R4):
`deal1-nordvik-portoalegre.pdf` (`eab47557…`) dan `deal2-portoalegre-clubz.pdf`
(`2d72a523…`) — keduanya hanya ada di git history (commit `f741c98`). Diganti
ketika `sample-agreements/` dirapikan (hanya `tests/` tersisa) dan demo beralih
ke PDF uji di `tests/`.
