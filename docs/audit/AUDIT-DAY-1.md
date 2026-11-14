# Audit Day 1 dan hasil tes repo

**Tanggal audit:** Jumat, 13 November 2026  
**Acuan Day 1:** Rabu, 11 November 2026, sesuai tabel Jadwal di `PLAN.md`  
**Metode:** membaca target `PLAN.md`, catatan progres, file kerja, dan riwayat Git; lalu menjalankan tes yang tersedia.

> Dokumen ini menilai **target Day 1**, bukan menyatakan bahwa semua pekerjaan berhenti pada hari itu. Beberapa pekerjaan Day 2 dan implementasi lanjutan sudah masuk repo.
>
> Label “selesai secara isi” berarti artefaknya ada dan dapat diperiksa. Label “terlambat menurut Git” berarti commit pertamanya muncul setelah 11 November; Git tidak dapat membuktikan kapan file mulai ditulis di komputer masing-masing.

## Ringkasan satu menit

| Orang | Target Day 1 | Penilaian Day 1 | Kondisi repo saat audit |
|---|---|---|---|
| Orang 1 | Setup Rust/testnet dan `INTERFACE.md` | **Belum memenuhi tenggat** | Kontrak, token, WASM, tes, dan skrip sudah banyak tersedia; deploy belum |
| Orang 2 | `schema.ts` dan fixture Deal 1 | **Isi lengkap, tetapi commit 13 Nov** | Reader dan tes juga sudah tersedia; live AI lulus saat diaudit |
| Orang 3 | Setup Next.js dengan `near-dapp` dan kerangka halaman | **Belum ada** | `web/` hanya `.gitkeep`; tidak ada website yang dapat dijalankan |
| Orang 4 | U1 repo, aturan bersama, mulai Figma | **U1 selesai; desain sudah jauh berkembang** | Repo/desain/PDF ada, tetapi sejumlah artefak koordinasi masih kurang |

**Jalur kritis saat ini:** frontend belum mulai, kontrak belum deployed karena akun master belum tersedia, dan Collector belum dibuat. Unit test yang hijau belum menghasilkan aplikasi yang dapat dipakai juri.

---

## 1. Orang 1 — Kontrak dan skrip

### Target Day 1

Dari `PLAN.md`:

- Setup Rust dan akun testnet.
- Menulis `contract/INTERFACE.md`.
- Interface ditargetkan selesai dan beku Rabu malam.

### Yang tersedia sekarang

- `contract/INTERFACE.md`: fungsi, bentuk data, status, event, token, view, dan aturan pembayaran.
- `contract/src/lib.rs`: kontrak FULLBACK.
- `contract/ft/`: token fEUR.
- `contract/tests/deal1.rs`, `contract/tests/resale.rs`, dan helper tes.
- `contract/res/fullback.wasm` dan `contract/res/feur.wasm`.
- `scripts/setup-demo.ts`, `scripts/run-demo.ts`, `scripts/deploy.sh`, `scripts/add-keeper-key.sh`.
- Dua keputusan terbuka sudah diisi sesuai usulan: cicilan boleh dibayar lebih awal dan top up mengembalikan jaminan ke jumlah penuh.

### Kesenjangan Day 1 dan sekarang

1. Commit yang memperkenalkan `INTERFACE.md` tercatat **12 November**, bukan 11 November.
2. `INTERFACE.md` sendiri masih bertuliskan **“draft v1, menunggu persetujuan grup”**. Catatan Orang 2 mengatakan ia menyetujui, tetapi belum ada penegasan persetujuan keempat orang di interface.
3. Alamat FULLBACK dan fEUR masih placeholder `<master>`.
4. `.env` lokal saat audit memiliki `MASTER_ACCOUNT_ID` kosong dan `MASTER_PRIVATE_KEY` tidak terdaftar. Konfigurasi master untuk deploy belum tersedia.
5. Belum ada bukti deploy testnet, dua kali `npm run demo`, atau link transaksi testnet.
6. Audit `near-contract-audit` sebelum deploy final belum terdokumentasi selesai.
7. Catatan progres menyebut kebutuhan sekitar 12 testnet NEAR, sedangkan komentar `scripts/setup-demo.ts` menyebut sekitar 15. Pakai angka script sebagai estimasi yang lebih konservatif dan konfirmasi Orang 1.
8. `README.md` menyebut near-workspaces, sedangkan tes aktual adalah unit test near-sdk dengan simulasi ledger fEUR. Ini disengaja karena sandbox NEAR tidak berjalan di Windows menurut catatan Orang 1.

### Hasil tes aktual

`cargo test` di `contract/`:

| Bagian | Hasil |
|---|---:|
| Unit test token fEUR | 3 lulus |
| Tes `deal1.rs` | 24 lulus |
| Tes `resale.rs` | 7 lulus |
| **Total** | **34 lulus, 0 gagal** |

Tambahan: `npm run typecheck -w scripts` **lulus**.

**Kesimpulan:** implementasi Orang 1 sudah jauh melampaui target Day 1 dan logika yang dites kuat. Namun target interface tepat waktu/beku dan bukti testnet masih belum selesai.

### Tindakan berikutnya

1. Konfirmasi persetujuan interface dari keempat orang tanpa mengubah bentuknya diam-diam.
2. Sediakan akun master testnet berdana dan private key melalui `.env`, bukan chat publik/repo.
3. Jalankan audit kontrak, deploy, isi alamat aktual, lalu `npm run demo` dua kali.
4. Simpan bukti command dan link explorer di `docs/progress/orang-1.md`.
5. Bahas dua isu review yang ditunda—storage deposit dan pembatalan deal/resale—dengan seluruh tim sebelum mengubah interface. Keduanya bukan perbaikan yang boleh diselipkan sepihak.

## 2. Orang 2 — AI Reader / backend

### Target Day 1

- `agent/schema.ts`.
- Fixture Deal 1 sesuai angka terkunci.

### Yang tersedia sekarang

- `agent/schema.ts`: Zod schema untuk jawaban LLM dan output final.
- `agent/fixtures/deal1.json`: Deal 1 lengkap, nama Lucas Andrade dan tanggal lahir sesuai PDF.
- `agent/fixtures/deal2.json`: resale tanpa collateral.
- `agent/training.ts`: perhitungan bps dari umur, bukan dari LLM.
- `agent/reader/`: ekstraksi PDF, SHA-256, panggilan NEAR AI Cloud, pengecekan kutipan, dan enrichment.
- `agent/tests/`: tes training, schema, Reader, serta tes live.
- `agent/clubs.json`: pemetaan klub ke akun, masih dengan placeholder `<master>`.

### Kesenjangan Day 1 dan sekarang

1. Riwayat Git menunjukkan `schema.ts` dan fixture pertama masuk pada commit **13 November 15:51 WIB**. Catatan progres menandainya sebagai pekerjaan 11 November; jadi yang dapat disimpulkan hanya “isi tersedia, commit terlambat”, bukan bahwa pekerjaan pasti baru dimulai 13 November.
2. Collector (`agent/collector/index.ts`) dan `illegal-attempt.ts` belum ada. Ini target berikutnya/U5, bukan kegagalan Day 1.
3. Placeholder akun `<master>` belum dapat diganti sebelum deploy.
4. Catatan progres yang menyebut live API selalu terblokir `402` **sudah kedaluwarsa**: tes live berhasil saat audit dengan konfigurasi lokal saat ini.
5. Tes unit default tidak menjalankan Reader live. Keduanya perlu dilaporkan terpisah.
6. Ada perubahan lokal pada `agent/reader/llm.ts`, `agent/tests/reader-live.test.ts`, dan `docs/progress/orang-2.md` yang belum di-commit saat audit. Audit tidak mengubahnya.

### Hasil tes aktual

`npm test -w agent`:

- **26 lulus, 0 gagal, 1 live test dilewati** oleh konfigurasi default.
- Tes mencakup bps usia, schema/fixture, kutipan yang dikarang, sell-on net, cicilan tidak cocok, klub tidak dikenal, serta penolakan PDF asing pada fixture mode.

`npm run typecheck -w agent`: **lulus**.

`LIVE_TEST=1 npm test -w agent -- tests/reader-live.test.ts`:

- **1 tes live lulus** dalam sekitar 13 detik.
- PDF asli menghasilkan harga 10 juta, empat cicilan 2,5 juta, collateral 2,5 juta, sell-on 1500 bps gross, Kota FC 400 bps, Akademi Desa 100 bps, dan `warnings=[]`.

Pemeriksaan tambahan terhadap PDF:

- Semua **10 kutipan** fixture Deal 1 ditemukan dalam teks PDF yang diekstrak.
- Semua **6 kutipan** fixture Deal 2 ditemukan.
- PDF TAMPERED memang berisi perubahan jaminan menjadi `EUR 1,500,000`.
- PDF Deal 1 yang dibaca langsung dari blob Git berhasil dipetakan ke fixture dengan `warnings=0`.

**Kesimpulan:** deliverable Day 1 tersedia dan implementasi Reader berfungsi, termasuk tes live saat audit. Klaim “AI tidak berfungsi/API pasti terblokir” tidak sesuai dengan hasil terbaru.

### Tindakan berikutnya

1. Perbarui progres: live Reader berhasil pada 13 November; simpan batasan bahwa kunci/kredit dapat berbeda pada anggota lain.
2. Setelah deploy, ganti placeholder akun sesuai koordinasi, tanpa mengubah schema beku.
3. Implementasikan Collector yang membaca view dahulu dan hanya mengirim `settle_due` setelah jatuh tempo.
4. Buat dan uji penolakan kunci terbatas di testnet.
5. Jangan menutupi masalah PDF Windows dengan menambah hash CRLF ke fixture.

## 3. Orang 3 — Frontend

### Target Day 1

- Setup `web/` menggunakan skill `near-dapp`.
- Next.js/App Router dan kerangka halaman.

### Kondisi aktual

- `web/` hanya memiliki `.gitkeep`.
- Tidak ada `web/package.json`, `web/app/`, `web/components/`, `web/lib/mock.ts`, konfigurasi Next.js, route API, atau aset web.
- `docs/progress/orang-3.md` masih template kosong.
- Tidak ada commit untuk `web/` selain placeholder kerangka awal.
- Tidak ada build, server lokal, URL Vercel, wallet login, atau Judge demo yang dapat diuji.

### Bukti kegagalan menjalankan web

`npm run build -w web` dan `npm run dev -w web` sama-sama menghasilkan:

```text
npm error No workspaces found:
npm error   --workspace=web
```

Ini disebabkan package web belum ada, bukan karena API key NEAR AI atau saldo testnet.

**Kesimpulan:** target Day 1 Orang 3 belum terpenuhi dan seluruh U6/U7 belum dapat dicoba. Ini adalah hambatan terbesar untuk pengalaman pengguna.

### Yang sudah tersedia untuk membantu

- Desain Fase 1 dan Fase 2 terdokumentasi rinci di `docs/design-handoff.md`.
- Token visual, logo final, route, status, overlay, dan perilaku tombol sudah disiapkan.
- `agent/README.md` menjelaskan cara web memanggil Reader.
- `contract/INTERFACE.md` menjelaskan bentuk view dan transaksi.

### Tindakan berikutnya

1. Orang 3 harus segera membuat package Next.js yang benar-benar muncul sebagai workspace `web`.
2. Prioritaskan kerangka semua route Fase 1 dengan mock netral, lalu build hijau.
3. Isi `docs/progress/orang-3.md` dengan kondisi sebenarnya dan blocker, bahkan bila progres masih nol.
4. Setelah mock stabil, sambungkan view testnet dan baru tambahkan Fase 2/Judge demo.
5. Jangan menaruh private key akun demo di browser atau file frontend.

## 4. Orang 4 — Repo, desain, konten, koordinasi

### Target Day 1

- U1: struktur repo, workspace, keamanan rahasia, dan aturan bersama.
- Mulai Figma.

### Yang tersedia sekarang

- Struktur repo dan npm workspaces di `package.json`.
- `.env.example`, `.gitignore`, `LICENSE`, `README.md`, `PLAN.md`, `CLAUDE.md`.
- Empat catatan progres.
- `docs/design-handoff.md`: desain lengkap, route, token visual, status, dan perilaku.
- Logo final di `docs/brand/`.
- `sample-agreements/`: dua deal, PDF TAMPERED, sumber teks, dan generator PDF.
- `docs/bukti-masalah.md` dan `docs/pembeda.md` dengan sumber.
- `docs/submit-checklist.md` dan `docs/libraries.md`.

Commit U1 memang tercatat pada **11 November**. Figma tidak dapat diuji dari repo, jadi penilaian desain berdasarkan handoff dan aset yang tersedia, bukan inspeksi visual langsung file Figma.

### Kesenjangan koordinasi saat audit

1. **Belum ada `.gitattributes`.** Semua tiga PDF memiliki `i/lf w/crlf`; `core.autocrlf=true` pada komputer audit.
2. Hash working tree berbeda dari hash fixture/dokumentasi:

| PDF | Hash commit/dokumentasi | Hash working tree Windows |
|---|---|---|
| Deal 1 | `eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832` | `e9972e220b2d902751dd53b5243355e73417ef0a181737edb6b1978faa5125a3` |
| Deal 1 TAMPERED | `7a05eac9f8f4fe80d36bc0aac0788ccd3bfe17d69935fa09badf21355faa0c14` | `ef9b6b52233d9ebf04dfc3a644ed04489ad8893e64531f6534a5afa94d4b969d` |
| Deal 2 | `2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e` | `6c1e00b1827a2e941d36393aedc45de776a76860ac2ad73f757fea1725fa905b` |

Akibat yang sudah dibuktikan: Reader dalam `DEMO_MODE=true` menolak PDF Deal 1 lokal sebagai “not one of the demo agreements”. Ini bukan masalah isi perjanjian atau kemampuan AI.

3. `.env.example` belum memuat variabel yang diminta Orang 1/dipakai setup, termasuk `MASTER_PRIVATE_KEY`, `CONTRACT_PRIVATE_KEY`, kunci/akun dua akademi, dan `KEEPER_FULL_ACCESS_PRIVATE_KEY`.
4. `docs/video-script.md` dan `docs/video-prompts.md` disebut di progres dan checklist, tetapi tidak ada di repo saat audit.
5. `docs/libraries.md` masih banyak `[isi]`/`[cek]`; Reader sudah memberikan versi aktual dan menyatakan package `openai` tidak digunakan.
6. README masih memiliki placeholder URL/nama tim/pilihan library dan menyebut kontrak sudah deployed padahal alamat deploy belum tersedia.
7. Font tertulis Instrument Sans di `CLAUDE.md`, sedangkan handoff/libraries menyebut Schibsted Grotesk. Orang 4 dan Orang 3 perlu memilih satu sumber desain yang konsisten; `PLAN.md` tidak menetapkan font.
8. `package-lock.json` dan `.env.example` perlu diselaraskan dengan kebutuhan script dan web setelah pekerjaan tersebut masuk.

### Bukti keamanan yang diperiksa

- `.env` dan `scripts/.env.demo` cocok dengan aturan `.gitignore`.
- `.env` lokal tidak muncul sebagai file tracked.
- Audit hanya memeriksa **ada/tidaknya** konfigurasi sensitif; private key tidak dibaca atau disalin ke laporan.
- Audit ini bukan pemeriksaan menyeluruh seluruh riwayat Git untuk kebocoran rahasia. Checklist submit tetap harus dijalankan sebelum repo dibuat publik.

**Kesimpulan:** U1 Day 1 terpenuhi dan desain/konten berkembang sangat banyak. Masalah terpenting sekarang adalah konsistensi artefak bersama, terutama byte PDF, konfigurasi, dan dokumen submit.

### Tindakan berikutnya

1. Dengan persetujuan tim, tambahkan `*.pdf -text` ke `.gitattributes`, lalu koordinasikan normalisasi ulang PDF tanpa menimpa pekerjaan lokal.
2. Lengkapi `.env.example` sesuai script, tetap tanpa nilai rahasia.
3. Pulihkan/tulis video script dan video prompts yang dirujuk checklist.
4. Lengkapi daftar library berdasarkan package aktual; hapus yang tidak dipakai.
5. Satukan keputusan font dan perbarui dokumen terkait.
6. Jangan mengisi placeholder README dengan URL/alamat rekaan.

---

## 5. Matriks tes lengkap

| Pemeriksaan | Hasil | Bukti/batas |
|---|---|---|
| `cargo test` di `contract/` | **Lulus: 34/34** | Unit test/simulasi lokal, bukan deploy testnet |
| `npm test -w agent` | **Lulus: 26; 1 skip** | Live test tidak aktif pada run default |
| `npm run typecheck -w agent` | **Lulus** | Tidak ada error TypeScript |
| `npm run typecheck -w scripts` | **Lulus** | Tidak ada error TypeScript |
| Live NEAR AI Reader | **Lulus: 1/1** | Berhasil dengan konfigurasi API lokal saat audit |
| Kutipan fixture Deal 1 | **10/10 cocok** | Teks diekstrak dari PDF working tree |
| Kutipan fixture Deal 2 | **6/6 cocok** | Teks diekstrak dari PDF working tree |
| PDF TAMPERED | **Perubahan terdeteksi** | Teks collateral berubah ke EUR 1.500.000 |
| Fixture dengan PDF versi Git | **Lulus** | Hash sesuai dan warnings kosong |
| CLI Reader dengan PDF working tree | **Gagal** | Hash CRLF tidak dikenal fixture |
| `npm run build -w web` | **Gagal** | Workspace/package web tidak ada |
| `npm run dev -w web` | **Gagal** | Workspace/package web tidak ada |
| Deploy testnet | **Belum dapat dites** | Akun master/alamat kontrak belum tersedia |
| `npm run demo` di testnet | **Belum dapat dites** | Bergantung pada deploy dan konfigurasi akun |
| Collector dan rogue-agent testnet | **Belum dapat dites** | Implementasi belum ada dan kontrak belum deployed |
| Audit keamanan kontrak | **Belum dibuktikan** | Laporan audit belum tersedia |
| Demo Vercel/juri | **Belum dapat dites** | Web dan URL belum ada |

## 6. Penilaian akhir yang adil

- **Bukan berarti semua orang gagal:** kontrak dan Reader sudah memiliki pekerjaan teknis substansial dan hasil tes nyata.
- **Bukan berarti aplikasi hampir selesai:** pengguna belum memiliki web, dan tidak ada bukti transaksi FULLBACK di testnet.
- **Keterlambatan commit tidak sama dengan keterlambatan mulai bekerja:** Git hanya membuktikan kapan perubahan masuk riwayat repo.
- **Target Day 1 perlu dibedakan dari target Jumat:** Collector, PDF lengkap, dan desain akhir bukan semuanya kewajiban Day 1.
- **Prioritas paling mendesak:** web oleh Orang 3 dan akun/deploy oleh Orang 1; Orang 4 menyingkirkan masalah PDF/env/dokumen; Orang 2 melanjutkan Collector setelah dependensi testnet siap.

Panduan langkah demi langkah untuk semua anggota ada di [`PANDUAN-PEMULA.md`](PANDUAN-PEMULA.md).
