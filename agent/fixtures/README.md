# Fixtures (Orang 2)

**Kunci jawaban Pembaca** untuk PDF demo, dipakai saat `DEMO_MODE=true` (tanpa API
key, tanpa LLM, biaya $0) dan sebagai acuan tes.

## Isi (per 15 Nov)

| File | Format | PDF sumber | Isi jawaban |
|---|---|---|---|
| `deal1.json` | `ReaderOutput` langsung | `deal1-nordvik-portoalegre.pdf` (Lucas, hanya di git `f741c98`, hash `eab47557…`) | **Data terkunci R2/R3**: Lucas Andrade, fee 10.000.000 = 4 × 2.500.000, jaminan 2.500.000, sell-on 15% gross, Kota FC 400 bps + Akademi Desa 100 bps |
| `deal2.json` | `ReaderOutput` langsung | `deal2-portoalegre-clubz.pdf` (Lucas resale, git `f741c98`, hash `2d72a523…`) | **Data terkunci R4**: 20.000.000 sekali bayar, **tanpa** jaminan, sell-on 15% gross |
| `ok01-basic.json` | `{ pdfHash, output }` | `sample-agreements/tests/OK-01-basic.pdf` | Daniel Okoro, fee 6.000.000 = 3 × 2.000.000, jaminan 2.000.000, sell-on 10% gross, Akademi Desa 100 bps + Kota FC 250 bps |
| `ok02-unequal-installments.json` | `{ pdfHash, output }` | `sample-agreements/tests/OK-02-unequal-installments.pdf` | Daniel Okoro, fee 10.000.000 = 4 jt + 3 jt + 3 jt, jaminan 3.000.000, sell-on 10% gross |
| `verify-ok01-tampered.json` | `{ pdfHash, output }` | `sample-agreements/tests/VERIFY-OK-01-TAMPERED.pdf` | Sama dengan `ok01-basic.json` kecuali **sell-on 5% (500 bps)** + **1 warning** "tampered copy" (kartu kuning di web). Catatan: `WarningSchema.code` dibekukan, jadi warning ini memakai kode `quote_not_found` — maknanya dibawa oleh `field`/`message`; kode khusus `tampered_copy` butuh persetujuan 4 orang |

- **`deal1.json` dan `deal2.json` jangan diubah** (angka R1–R4 terkunci, CLAUDE.md).
  Bentuknya juga dibaca langsung oleh `web/tests/ai-review.test.mjs` dan
  `web/scripts/test-pdf-verification.mjs`.
- `ok01`/`ok02` (dibuat Rio, 15 Nov) membuat PDF uji netral di working tree
  langsung bisa dipakai di `DEMO_MODE`, tanpa memulihkan PDF Lucas dari git.
  `pdfHash` = hash commit di `sample-agreements/tests/manifest.json` (dicek tes).

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

`reader/index.ts` (`DEMO_FIXTURES_BY_HASH`) memetakan SHA-256 PDF yang diunggah ke
jawaban: dua hash Lucas ditulis di kode, dua hash tes diambil dari `pdfHash` di file
`ok01`/`ok02`. Kalau cocok, `output` langsung dikembalikan tanpa memanggil LLM.

Hash yang dipakai adalah hash **byte versi commit** (LF). `.gitattributes` mencegah
checkout mengubah byte PDF. Kalau di Windows hash tetap tidak cocok (salinan lama
ber-CRLF), cek `git ls-files --eol "sample-agreements/tests/*.pdf"` lalu pulihkan
byte commit (hapus PDF lalu `git checkout -- sample-agreements/tests/`). Jangan
mengubah fixture.
