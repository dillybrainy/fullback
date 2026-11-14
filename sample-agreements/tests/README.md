# Tes agent Pembaca (Reader) FULLBACK

19 PDF fiktif untuk mengetes apakah agent benar-benar mengecek isi perjanjian. Semua PDF deterministik (dibuat ulang hasilnya sama persis): `python3 make_tests.py <folder>`.

**Cara pakai:** agent harus mode live (`DEMO_MODE=false` + API key, lihat agent/README.md). Mode demo hanya menerima PDF Lucas, jadi semua file ini akan ditolak dengan pesan 'not a demo agreement'.

```bash
npm run reader -w agent -- ../sample-agreements/tests/OK-01-basic.pdf
```

Akademi di PDF ini memakai nama yang sudah ada di `agent/clubs.json` (Akademi Desa, Kota FC, Nordvik IF), kecuali BAD-03 yang memang sengaja tidak terdaftar.

| File | Jenis | Hasil yang diharapkan | SHA-256 (awal) |
|---|---|---|---|
| `OK-01-basic.pdf` | BENAR | Tanpa warning. Fee 6,000,000 = 3 x 2,000,000. Sell-on 10% gross. Akademi Desa 12-15 -> 1.00%, Kota FC 16-20 -> 2.50%. | `1340d083678a3125` |
| `OK-02-unequal-installments.pdf` | BENAR | Tanpa warning. Cicilan tidak sama: 4,000,000 + 3,000,000 + 3,000,000 = 10,000,000. | `dc12f270a006a194` |
| `OK-03-single-payment-no-security.pdf` | BENAR | Tanpa warning. Satu kali bayar 5,000,000, tanpa pasal jaminan (collateral kosong boleh). | `c8a51015ff50a3a0` |
| `OK-04-six-installments.pdf` | BENAR | Tanpa warning. 6 cicilan x 2,000,000 = 12,000,000. | `3714ab993e31945d` |
| `OK-05-royalty-max-5pct.pdf` | BENAR | Tanpa warning. Akademi Desa 12-15 (1.00%) + Kota FC 16-23 (4.00%) = tepat 5% (batas maksimal). | `72d7c4693903ac0b` |
| `OK-06-words-first.pdf` | BENAR | Tanpa warning. Angka ditulis huruf dulu baru digit: 'seven million five hundred thousand euros (EUR 7,500,000)'. Agent harus tetap membaca 7,500,000. | `9cdd33fe9cbb86d0` |
| `OK-07-no-academy-share.pdf` | BENAR | Tanpa warning dan tanpa akademi. Pemain baru terdaftar sejak umur 24 (Nordvik IF), jadi royalti 0% dan daftar akademi kosong. | `54d1b3da71998999` |
| `BAD-01-installments-dont-add-up.pdf` | SALAH - harus ketahuan | Warning installments_mismatch: 3 x 1,800,000 = 5,400,000, padahal fee 6,000,000. | `0e10e3eabf2af817` |
| `BAD-02-sell-on-net.pdf` | SALAH - harus ketahuan | Warning sell_on_net: sell-on dihitung dari 'net amount', FULLBACK hanya mendukung gross. | `90781f7068e736d2` |
| `BAD-03-unknown-academy.pdf` | SALAH - harus ketahuan | Error 'Unknown training club "Sunrise Academy"': akademi tidak ada di agent/clubs.json, jadi deal tidak boleh dibuat. | `7ee0c067e3be2cb6` |
| `BAD-04-sell-on-decimal.pdf` | SALAH - harus ketahuan | Error validasi: sell-on 12.5% bukan bilangan bulat (schema hanya menerima persen bulat). | `03a51f33eb73b8a3` |
| `BAD-05-no-birth-date.pdf` | SALAH - harus ketahuan | Tanggal lahir pemain tidak ada. Harus error validasi, atau quote_not_found kalau AI mengarang tanggal. | `e140bd939ff61b33` |
| `BAD-06-no-schedule.pdf` | SALAH - harus ketahuan | Jadwal cicilan tidak ada ('to be agreed later'). Harus error validasi, atau quote_not_found kalau AI mengarang cicilan. | `6b53ccffd39bafd5` |
| `BAD-07-contradicting-clauses.pdf` | SALAH - harus ketahuan | Pasal 3.2 bilang 3 cicilan, pasal 3.3 bilang 4 cicilan x 2,000,000. Kalau AI ambil 4 cicilan -> installments_mismatch (8,000,000 vs 6,000,000). | `733e3df15dc51410` |
| `GAP-01-words-digits-conflict.pdf` | SALAH - kemungkinan LOLOS | Digit 6,000,000 tapi huruf 'five million'. Agent tidak membandingkan angka dengan hurufnya. Manusia harus menangkap ini. | `2ca5e6560b38ebc0` |
| `GAP-02-security-too-small.pdf` | SALAH - kemungkinan LOLOS | Jaminan cuma 500,000, padahal satu cicilan 2,000,000. Agent tidak mengecek jaminan = satu cicilan. | `715accff704d1ba0` |
| `GAP-03-dates-before-signing.pdf` | SALAH - kemungkinan LOLOS | Cicilan pertama jatuh tempo 1 Jan 2026, sebelum perjanjian ditandatangani (2 Mar 2026), dan urutannya acak. Agent tidak mengecek tanggal. | `94ffcee734ce8bec` |
| `GAP-04-overlapping-history.pdf` | SALAH - kemungkinan LOLOS | Riwayat tumpang tindih: Akademi Desa 12-17 dan Kota FC 16-20 (umur 16-17 dihitung dua kali). Agent tidak mengecek tumpang tindih. | `afc2f23a5a981fb3` |
| `VERIFY-OK-01-TAMPERED.pdf` | SALAH - untuk Verify | Sama persis dengan OK-01, kecuali sell-on 10% jadi 5%. Di halaman Verify, sidik jarinya harus beda dari OK-01. | `5ef3249b32b9e8fb` |

## Arti kolom Jenis

- **BENAR**: `warnings` harus kosong dan angka hasil bacaan sama dengan PDF.
- **SALAH - harus ketahuan**: agent harus mengeluarkan warning atau error yang ditulis di tabel. Kalau lolos tanpa warning, itu bug.
- **SALAH - kemungkinan LOLOS**: agent memang belum punya pengecekan untuk ini. Kalau lolos, itu bukan bug tapi celah yang perlu dicek manusia (atau ditambah aturan baru).
- **SALAH - untuk Verify**: pasangan OK-01 untuk halaman Verify. Sidik jarinya harus beda.

SHA-256 lengkap ada di `manifest.json`.
