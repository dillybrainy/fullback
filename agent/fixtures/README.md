# Fixtures (Orang 2)

Data demo Lucas (PLAN.md R1–R4), angka terkunci — jangan diubah oleh AI. Dipakai
oleh Pembaca saat `DEMO_MODE=true` (tanpa API key) dan sebagai acuan tes.

## Konvensi

- Bentuk setiap file persis `ReaderOutput` dari `agent/schema.ts` (lolos zod).
- **Uang dalam fEUR utuh** (1 fEUR = €1), bukan satuan terkecil. Konversi ke U128
  lewat `eurToSmallestUnit()` di `schema.ts`.
- `sellOn.bps` dan `trainingClubs[].bps` sudah dalam basis points (1 bps = 0,01 %).
- `trainingClubs` hanya berisi klub yang **menerima** Academy royalties (bps > 0).
  Klub di riwayat pembinaan yang tidak dapat royalti (mis. Nordvik IF, umur 24+,
  0 bps, sekaligus penjual) **tidak** masuk `trainingClubs`, karena kontrak menolak
  klub pembina yang sama dengan penjual/pembeli. Penyaringan ini dilakukan
  Pembaca (`enrich.ts`), bukan oleh web.
- `account` memakai placeholder `<master>` (mis. `kotafc.<master>.testnet`).
  Nama akun asli diganti web saat runtime (lihat `agent/README.md`), mengikuti
  `scripts/setup-demo.ts` (prefix `nordvik`, `portoalegre`, `clubz`, `kotafc`,
  `akademidesa`).
- `quote` adalah teks persis dari PDF (ASCII, spasi dinormalisasi). Semua kutipan
  di bawah **sudah diuji cocok** terhadap PDF asli dengan `pdfjs-dist` v4
  (Rabu 11 Nov).

## Isi

| File | Sumber PDF | Isi |
|---|---|---|
| `deal1.json` | `sample-agreements/deal1-nordvik-portoalegre.pdf` | Deal 1: Nordvik IF → Porto Alegre FC, 10.000.000, 4 × 2.500.000, jaminan 2.500.000, sell-on 15% gross, pembinaan Kota FC 400 bps + Akademi Desa 100 bps |
| `deal2.json` | `sample-agreements/deal2-portoalegre-clubz.pdf` | Deal 2 (penjualan ulang): Porto Alegre FC → Club Z, 20.000.000 sekali bayar, **tanpa `collateral`** (resale tidak punya jaminan), sell-on 15% gross diakui dari Deal 1 |

Keputusan bentuk Deal 2 (Rabu 11 Nov): `collateral` **opsional** di
`ReaderOutputSchema` — deal penjualan ulang tidak punya jaminan. Sell-on dan
klub pembina di Deal 2 hanya untuk tampilan; angka yang dipakai kontrak tetap
yang tersimpan on-chain dari Deal 1 (`record_resale` tidak menerima keduanya).

## Pencocokan hash di DEMO_MODE

`reader/index.ts` mencocokkan SHA-256 PDF dengan fixture. Hash yang dipakai
adalah hash **versi commit** (lihat tabel di `sample-agreements/README.md`):

| PDF | SHA-256 |
|---|---|
| `deal1-nordvik-portoalegre.pdf` | `eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832` |
| `deal2-portoalegre-clubz.pdf` | `2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e` |

**Perhatian:** checkout Windows (CRLF) atau regenerasi `make_agreements.py` di
Windows mengubah byte PDF dan hash-nya. Kalau DEMO_MODE menolak PDF demo,
jalankan `git checkout -- sample-agreements`. Masalah ini sudah diteruskan ke
Orang 4 (butuh `.gitattributes` `*.pdf -text` di root).
