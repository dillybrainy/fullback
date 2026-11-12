# Sample agreements (data demo Lucas, Fase 2)

Dokumen fiktif untuk demo FULLBACK. Angkanya persis PLAN.md R1–R4. Jangan dipakai di halaman Fase 1.

| File | Isi | SHA-256 |
|---|---|---|
| `deal1-nordvik-portoalegre.pdf` | Deal 1: Nordvik IF → Porto Alegre FC, 10.000.000, 4 × 2.500.000, jaminan 2.500.000, sell-on 15% gross | `eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832` |
| `deal1-TAMPERED.pdf` | Salinan Deal 1 dengan **satu angka diubah**: jaminan di Pasal 4.1 jadi EUR 1,500,000 | `7a05eac9f8f4fe80d36bc0aac0788ccd3bfe17d69935fa09badf21355faa0c14` |
| `deal2-portoalegre-clubz.pdf` | Deal 2: Porto Alegre FC → Club Z, 20.000.000 sekali bayar; mengakui sell-on Nordvik 15% gross | `2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e` |
| `*.md` | Sumber teks yang sama persis dengan isi PDF | – |

Hash di atas berlaku untuk file yang ada di folder ini. PDF dibuat deterministik (`rl_config.invariant = 1`), jadi kalau dibangun ulang dari script yang sama hasilnya byte-per-byte identik.

## Untuk Orang 2 (Pembaca)

- Nama pemain di PDF: **Lucas Andrade**, lahir **14 March 2001** (umur 26 saat Deal 1, April 2027). Fixture `agent/fixtures/deal1.json` sebaiknya memakai nama dan tanggal ini.
- Riwayat pembinaan ada di Annex A (tabel): Akademi Desa umur 12 to 15 (2013 to 2016), Kota FC umur 16 to 23 (2017 to 2024), Nordvik IF sejak umur 24.
- Lokasi angka:
  - Harga: Pasal 3.1
  - Cicilan: Pasal 3.2 (jatuh tempo 30 April 2027, 31 July 2027, 31 October 2027, 31 January 2028)
  - Jaminan: Pasal 4.1
  - Sell-on: Pasal 5.1 (basis gross)
  - Solidarity: Pasal 6.2
- **Cocokkan kutipan setelah merapikan spasi** (`text.replace(/\s+/g, " ")` di teks PDF dan di kutipan). `pdftotext` memotong baris di tengah kalimat. Semua kutipan kunci sudah diuji ketemu dengan cara ini.
- Teks PDF hanya memakai ASCII (tanda kutip lurus, tanda hubung biasa), supaya pencocokan persis tidak gagal karena karakter tipografi.

## Untuk Orang 3 / juri (Verifikasi)

- `deal1-nordvik-portoalegre.pdf` → harus ✅ cocok dengan deal demo.
- `deal1-TAMPERED.pdf` → harus ❌ tidak cocok. Dari luar terlihat sama, hanya satu angka yang berubah.

## Catatan

- Repo sudah punya draft perjanjian Deal 1 dari commit "U1 kerangka repo + U8 draft perjanjian Deal 1". Pakai **satu** versi saja. File di folder ini dibangun dari PLAN rev 2 dan sudah diuji kutipannya. Kalau kalian memakai versi ini, hapus draft lama supaya Pembaca dan fixture tidak membaca file yang salah.
- Script pembuatnya: `sample-agreements/make_agreements.py` (opsional; jalankan `python3 sample-agreements/make_agreements.py sample-agreements`). Sengaja tidak ditaruh di `scripts/` karena folder itu milik Orang 1.
