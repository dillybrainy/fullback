# Panduan FULLBACK untuk pemula

Ditulis 13 November 2026 setelah pemeriksaan repo. Panduan ini memakai **Windows PowerShell**.

> **Baca ini dulu:** saat ini kontrak dan AI Reader bisa dites, tetapi **website belum ada** (`web/` masih kosong), kontrak **belum dideploy ke testnet**, dan Collector **belum dibuat**. Jadi jangan kaget kalau `npm run dev` gagal. Ini bukan salah kalian.
>
> Hasil pemeriksaan lengkap ada di [`AUDIT-DAY-1.md`](AUDIT-DAY-1.md).

---

## 1. FULLBACK itu apa, tanpa bahasa blockchain?

Bayangkan klub A menjual pemain ke klub B seharga 10 juta euro, dibayar empat kali.

Masalahnya: klub B bisa saja tidak membayar cicilan berikutnya. Klub A harus menagih, menggugat, lalu menunggu.

FULLBACK mencoba menjadi **petugas pembayaran otomatis** dengan aturan yang sudah disepakati:

1. Perjanjian PDF dibaca AI menjadi angka-angka: harga, cicilan, jaminan, sell-on, dan klub pembina.
2. Klub B menitipkan jaminan senilai satu cicilan.
3. Setiap cicilan yang dibayar langsung dibagi ke klub penjual dan akademi pemain.
4. Kalau klub B telat, jaminannya dipakai untuk membayar cicilan itu.
5. Kalau jaminan habis dan klub B tidak mengisinya kembali, deal menjadi `Defaulted`.
6. Kalau pemain dijual lagi, klub lama mendapat sell-on dan akademi mendapat bagiannya secara otomatis.

**Semua token dan saldo yang dipakai proyek ini berada di NEAR testnet. fEUR adalah uang mainan dan NEAR testnet tidak boleh diisi dengan uang asli. Jangan pernah memakai mainnet.**

## 2. Arti istilah yang akan sering muncul

| Istilah | Arti sederhana |
|---|---|
| **Blockchain** | Buku catatan bersama yang sulit diubah diam-diam. |
| **NEAR testnet** | Tempat latihan NEAR. Akun dan transaksinya nyata di jaringan latihan, tetapi nilainya bukan uang asli. |
| **Mainnet** | Jaringan dengan uang asli. **Dilarang untuk proyek ini.** |
| **Smart contract / kontrak** | Program di blockchain yang menjalankan aturan deal. Bukan PDF perjanjiannya. |
| **fEUR** | Token euro mainan buatan tim. `1 fEUR` mewakili `EUR 1` dalam cerita. |
| **NEAR** | Token jaringan untuk membuat akun, menyimpan data, dan membayar biaya transaksi. Di sini juga memakai testnet. |
| **Wallet** | Dompet aplikasi untuk menyetujui transaksi dengan akun NEAR. |
| **Account ID** | Nama akun, misalnya `portoalegre.contoh.testnet`. Mirip alamat pengguna. |
| **Private key** | Kunci rahasia untuk menandatangani transaksi. Siapa pun yang memilikinya dapat memakai akun tersebut. |
| **Function-call access key** | Kunci dengan izin terbatas. Collector hanya boleh memanggil `settle_due`, bukan memindahkan token. |
| **Deploy** | Memasang program kontrak ke akun testnet supaya bisa dipakai lewat internet. |
| **Explorer / nearblocks** | Situs untuk melihat bukti transaksi testnet. Mirip bukti transfer yang bisa dibuka siapa pun. |
| **Hash / sidik jari PDF** | Kode SHA-256 dari isi file. Satu byte berubah, kodenya berubah. Ini membantu mendeteksi PDF yang diubah. |
| **Collateral / jaminan** | fEUR yang ditahan kontrak untuk membayar cicilan bila pembeli telat. |
| **Sell-on** | Bagian untuk klub lama ketika pemain dijual lagi. |
| **Academy royalties** | Bagian untuk klub/akademi yang melatih pemain pada usia yang memenuhi aturan. |
| **bps / basis points** | Satuan persentase. `100 bps = 1%`; `10.000 bps = 100%`. |
| **AI Reader** | Pembaca PDF yang menghasilkan angka dan kutipan pasal. Bukan mesin yang memutuskan persentase royalti. |
| **Collector / Penagih** | Program yang mencari cicilan telat lalu meminta kontrak membayarnya dari jaminan. |
| **Fixture** | Jawaban JSON yang sudah disiapkan untuk PDF demo. Dipakai agar tes dapat berjalan tanpa AI. |
| **DEMO_MODE=true** | Reader memilih fixture berdasarkan hash PDF. Ini **bukan** berarti web/testnet sudah lengkap. |
| **Unit test** | Tes otomatis di komputer. Tidak membuktikan program sudah terpasang dan berjalan di testnet. |

## 3. Siapa melakukan apa?

| Orang | Bagian | Tempat |
|---|---|---|
| Orang 1 | Kontrak FULLBACK, token fEUR, deploy, skrip cerita | `contract/`, `scripts/` |
| Orang 2 | AI Reader, perhitungan royalti, Collector | `agent/` |
| Orang 3 | Website Next.js dan penghubung ke wallet/testnet | `web/` |
| Orang 4 | Dokumen, desain, PDF contoh, koordinasi | `docs/`, `sample-agreements/`, file root |

**Jangan mengedit folder orang lain tanpa kesepakatan.** Jangan mengubah `contract/INTERFACE.md`, `agent/schema.ts`, atau angka demo R1–R4 tanpa persetujuan keempat orang.

## 4. Contoh uang yang dipakai

### Deal pertama

Nordvik IF menjual Lucas Andrade ke Porto Alegre FC:

- Harga: **10.000.000 fEUR**.
- Cicilan: **4 × 2.500.000 fEUR**.
- Jaminan: **2.500.000 fEUR**.
- Setiap cicilan dibagi menjadi:

| Penerima | Setiap cicilan | Mengapa |
|---|---:|---|
| Nordvik IF | 2.375.000 | Penjual, setelah bagian akademi dipotong |
| Kota FC | 100.000 | 4% dari cicilan; melatih umur 16–23 |
| Akademi Desa | 25.000 | 1% dari cicilan; melatih umur 12–15 |
| **Total** | **2.500.000** | Tidak ada sisa |

Jaminan bukan biaya tambahan yang langsung diberikan ke penjual. Jaminan ditahan dahulu. Hanya **sisa** jaminan yang dapat ditarik kembali setelah semua cicilan selesai; bagian yang sudah dipakai menutup telat bayar tidak kembali.

### Deal kedua / penjualan ulang

Porto Alegre FC menjual pemain ke Club Z seharga **20.000.000 fEUR**, dibayar sekaligus:

| Penerima | Jumlah | Mengapa |
|---|---:|---|
| Porto Alegre FC | 16.000.000 | Penjual pada deal kedua |
| Nordvik IF | 3.000.000 | Sell-on 15% |
| Kota FC | 800.000 | Academy royalties 4% |
| Akademi Desa | 200.000 | Academy royalties 1% |
| **Total** | **20.000.000** | Sesuai harga jual |

---

# BAGIAN A — Yang BISA dites sekarang

## 5. Menyiapkan komputer

### 5.1 Program yang diperlukan

| Program | Untuk | Wajib sekarang? |
|---|---|---|
| Git | Mengambil dan memeriksa repo | Ya |
| Node.js 20 atau lebih baru | Menjalankan tes JavaScript/TypeScript | Ya |
| Rust + Cargo | Menjalankan tes kontrak | Untuk tes kontrak |
| Python | Membuat ulang PDF contoh | Tidak untuk pemakaian biasa |

Buka **PowerShell**, lalu periksa:

```powershell
git --version
node --version
npm --version
cargo --version
```

Kalau perintah `cargo` tidak dikenal, tes agen tetap dapat dijalankan, tetapi tes kontrak memerlukan instalasi Rust.

### 5.2 Masuk ke folder repo

Kalau lokasi repo kalian sama dengan komputer yang dipakai saat audit:

```powershell
Set-Location "D:\3_Coding\3_Project\fullback"
```

Kalau berbeda, ganti dengan lokasi repo kalian. Cara mudah: buka folder repo di File Explorer, ketik `powershell` di address bar, lalu tekan Enter.

Pastikan kalian berada di folder yang berisi `PLAN.md`:

```powershell
Test-Path .\PLAN.md
```

Jawaban yang benar: `True`.

### 5.3 Pasang dependency

```powershell
npm install
```

Ini membaca `package-lock.json` dan memasang package ke `node_modules/`. Folder itu tidak perlu dikirim ke Git.

### 5.4 File `.env`

`.env` adalah daftar pengaturan lokal. Beberapa di antaranya dapat berisi rahasia.

Kalau `.env` belum ada, di PowerShell jalankan:

```powershell
Copy-Item .env.example .env
```

**Jangan menjalankan perintah itu kalau `.env` sudah berisi konfigurasi/rahasia**, karena akan menimpa isinya.

Aturan keamanan:

- Jangan kirim isi `.env` ke grup chat atau AI.
- Jangan screenshot private key atau seed phrase.
- Jangan menaruh private key di kode, README, Figma, atau dokumen.
- Jangan mengubah `NEAR_NETWORK=testnet` menjadi `mainnet`.
- Kalau sebuah kunci pernah bocor, minta Orang 1 menggantinya; jangan hanya menghapus pesannya.

## 6. Tes paling mudah: kontrak FULLBACK

Dari folder root repo:

```powershell
Set-Location .\contract
cargo test
Set-Location ..
```

Saat diaudit, hasilnya:

```text
3 tes token fEUR lulus
24 tes Deal 1 lulus
7 tes resale dan PDF hash lulus
Total: 34 lulus, 0 gagal
```

Yang dibuktikan tes tersebut antara lain:

- Cicilan dibagi dengan jumlah yang tepat.
- Cicilan telat dapat dibayar dari jaminan.
- Pembeli ditandai harus top up setelah jaminan dipakai.
- Jaminan kosong pada cicilan telat berikutnya membuat deal `Defaulted`.
- `settle_due` dua kali tidak membayar cicilan yang sama dua kali.
- Token palsu ditolak.
- Kelebihan pembayaran dikembalikan.
- Pembayaran gagal masuk `pending`, lalu dapat diklaim.
- Resale hanya setelah Deal 1 selesai.
- Pembagian Deal 2 tepat.
- Hash PDF yang berbeda tidak cocok.

**Batas bukti:** ini adalah tes unit/simulasi lokal. Belum membuktikan akun testnet, deploy, gas sungguhan, link explorer, website, atau kunci Collector bekerja.

Kalau ada satu saja `FAILED`, salin **seluruh pesan error** ke catatan progres Orang 1. Jangan mengubah angka tes agar terlihat hijau.

## 7. Tes AI Reader dan perhitungan royalti

Dari root repo:

```powershell
npm test -w agent
npm run typecheck -w agent
npm run typecheck -w scripts
```

Hasil saat diaudit:

```text
26 tes lulus
1 tes live dilewati oleh tes default
Typecheck agent: lulus
Typecheck scripts: lulus
```

Tes yang dilewati bukan kegagalan: tes live memang hanya aktif dengan `LIVE_TEST=1` dan API key.

Arti penting hasil ini:

- Persentase royalti dihitung oleh kode, bukan dikarang AI.
- Kutipan yang tidak ada di PDF akan menghasilkan warning.
- Sell-on basis `net` ditandai tidak didukung.
- Total cicilan yang tidak sama dengan harga ditandai.
- Fixture Deal 1 dan Deal 2 sesuai bentuk data.

## 8. Mencoba Reader lewat terminal

Perintah Reader dijalankan oleh npm dari folder `agent/`. Karena itu path PDF dari root perlu diawali `../`:

```powershell
$env:DEMO_MODE = "true"
npm run reader -w agent -- "../sample-agreements/deal1-nordvik-portoalegre.pdf"
Remove-Item Env:\DEMO_MODE
```

`Remove-Item Env:\DEMO_MODE` hanya membersihkan pengaturan sementara pada jendela PowerShell tersebut; tidak menghapus file.

### Kalau muncul `not one of the demo agreements`

**Ini sedang terjadi pada checkout Windows yang diaudit.** Windows mengubah line ending PDF dari LF menjadi CRLF, sehingga hash berubah.

Contoh hasil audit:

| PDF Deal 1 | SHA-256 |
|---|---|
| Yang diharapkan fixture | `eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832` |
| File working tree Windows | `e9972e220b2d902751dd53b5243355e73417ef0a181737edb6b1978faa5125a3` |

Hash yang berbeda **bukan berarti isi perjanjiannya palsu**. Byte file-nya saja yang berubah.

**Jangan mengubah fixture untuk menerima hash baru.** Itu hanya menutupi masalah.

### Perbaikan yang disarankan untuk Orang 4, dengan persetujuan tim

Tambahkan `.gitattributes` di root:

```gitattributes
*.pdf -text
```

Setelah aturan itu tersimpan dan dibagikan, semua anggota perlu menormalkan ulang checkout PDF dari versi Git yang benar. Jangan menjalankan perintah restore secara membabi buta bila ada PDF lokal yang masih dikerjakan.

Sebelum melakukan normalisasi, koordinator harus memastikan PDF yang di-commit memang sumber kebenaran. Setelahnya, ulangi:

```powershell
git ls-files --eol "sample-agreements/*.pdf"
```

Targetnya `w/lf`, bukan `w/crlf`, lalu ulangi perintah Reader.

**Catatan:** instruksi lama yang menyarankan `git checkout -- sample-agreements` akan menimpa perubahan lokal. Jangan gunakan tanpa memastikan tidak ada pekerjaan lokal yang akan hilang.

## 9. Tes live NEAR AI Cloud

### Yang diperlukan

- `NEARAI_API_KEY` yang valid di `.env` root.
- Koneksi internet.
- PDF versi Git yang benar.
- Kesediaan memakai kuota API. Ini **bukan** transaksi blockchain dan tidak membutuhkan mainnet.

Jalankan dari root:

```powershell
$env:LIVE_TEST = "1"
npm test -w agent -- tests/reader-live.test.ts
Remove-Item Env:\LIVE_TEST
```

Hasil aktual pada 13 November: **1 tes live lulus dalam ±13 detik**, dengan:

- Harga `10.000.000`.
- Empat cicilan `2.500.000`.
- Jaminan `2.500.000`.
- Sell-on `1500 bps` / `gross`.
- Kota FC `400 bps`, Akademi Desa `100 bps`.
- `warnings` kosong.

Kalau mendapat `402 No spending limit configured`, akun API belum punya spending limit/kredit. Beritahu Orang 2; jangan mengganti API dengan layanan lain diam-diam.

Tes live membaca PDF langsung dari blob Git agar tidak terkena masalah CRLF Windows. Ini tidak memperbaiki file PDF yang nanti diunggah pengguna melalui website.

---

# BAGIAN B — Yang BELUM bisa dipakai sekarang

## 10. Website

Perintah yang direncanakan:

```powershell
npm run dev
```

Lalu seharusnya buka `http://localhost:3000`.

**Saat audit perintah ini gagal dengan `No workspaces found: --workspace=web`, karena `web/package.json` belum ada.** Belum ada Home, Dashboard, upload lewat browser, Verify, wallet login, Federation view, atau Judge demo yang dapat dicoba.

Jangan menghabiskan waktu mengganti API key atau membuat wallet untuk memperbaiki error ini. Yang harus menyelesaikannya adalah Orang 3.

Setelah Orang 3 menyatakan web siap, gunakan checklist sederhana ini:

1. `npm run build -w web` selesai tanpa error.
2. `npm run dev` menyala terus; jangan tutup jendela terminal itu.
3. Buka `http://localhost:3000`.
4. Home tampil dalam bahasa Inggris untuk produk umum.
5. New Deal membaca PDF dan menampilkan angka beserta pasalnya.
6. Warning kutipan harus terlihat dan tidak boleh disembunyikan.
7. Verify menampilkan PDF asli cocok dan PDF TAMPERED tidak cocok **terhadap deal yang memang dibuat dari PDF asli**.
8. Dashboard memfilter Selling, Buying, dan Academy royalties untuk akun yang dipilih.
9. Federation tidak mempunyai tombol transaksi.
10. Semua transaksi yang dikirim web memiliki link nearblocks yang benar-benar dapat dibuka.
11. Coba di HP/lebar layar kecil, bukan hanya laptop.
12. Matikan server lokal dengan `Ctrl+C` setelah selesai.

## 11. Deploy dan cerita penuh di testnet

> Bagian ini untuk Orang 1, atau anggota yang sudah diberi konfigurasi testnet oleh Orang 1. **Jangan membuat akun dengan uang asli.** Gunakan faucet testnet saja.

### Mengapa perlu setup?

Tanpa deploy, komputer hanya mempunyai file program. Belum ada kontrak FULLBACK atau token fEUR yang dapat dipanggil di internet.

`npm run setup:demo` dirancang untuk:

1. Membuat subakun klub, akademi, token, kontrak, dan Collector.
2. Deploy WASM yang sudah ada di `contract/res/`.
3. Mendaftarkan storage fEUR untuk penerima.
4. Memberi fEUR mainan kepada akun demo.
5. Membuat kunci terbatas Collector.
6. Menulis konfigurasi dan private key ke `scripts/.env.demo`.

File `scripts/.env.demo` **berisi private key dan tidak boleh dibagikan atau di-commit**.

### Persiapan

- Akun master **testnet** berdana dari faucet; komentar script menyebut sekitar **15 testnet NEAR**.
- `MASTER_ACCOUNT_ID` dan `MASTER_PRIVATE_KEY` di `.env` root.
- `NEAR_NETWORK=testnet`.
- Internet dan RPC testnet tersedia.
- Kesepakatan tim mengenai akun master, karena deploy ini akan dipakai bersama.

Saat audit, akun master dan `MASTER_PRIVATE_KEY` belum terkonfigurasi. Jangan menjalankan setup hanya untuk “mencoba” sebelum Orang 1 siap; script benar-benar membuat akun dan transaksi testnet.

### Perintah setelah siap

```powershell
npm run setup:demo
npm run demo
npm run demo
```

Dua kali `npm run demo` berturut-turut diperlukan untuk membuktikan cerita dapat diulang dan tidak bertabrakan dengan deal lama.

Untuk setiap langkah, periksa:

- Tidak ada transaksi gagal yang dilewati begitu saja.
- Link `testnet.nearblocks.io` dapat dibuka.
- Deal 1 bergerak `Proposed → Approved → Active → Completed`.
- Cicilan kedua dari jaminan mengurangi jaminan menjadi nol.
- Setelah top up dan semua cicilan, pembagian sesuai contoh di bagian 4.
- Resale menghasilkan pembagian Deal 2 yang tepat.
- Kunci terbatas Collector ditolak saat mencoba transfer fEUR.

### Menjalankan Collector nanti

Collector belum diimplementasikan saat audit. Setelah Orang 2 menyelesaikannya:

```powershell
npm run collector
```

Program dimaksudkan berjalan setiap 15 detik. Biarkan terminal terbuka dan hentikan dengan `Ctrl+C`.

Collector tidak boleh memanggil `settle_due` setiap 15 detik untuk semua deal tanpa membaca status dahulu. Kunci terbatas memiliki allowance terbatas; bahkan hasil `NotDue` dapat memakai biaya/allowance. Ia harus membaca view gratis dan hanya mengirim transaksi bila deal `Active` dan `next_due_at_ns` sudah lewat.

---

# 12. Urutan prioritas supaya proyek benar-benar bisa dipakai

1. **Orang 1:** dapatkan akun master testnet, selesaikan audit kontrak, deploy, isi alamat kontrak, lalu uji `npm run demo` dua kali.
2. **Orang 2:** pertahankan Reader yang sudah lulus; implementasikan Collector dan demo kunci terbatas setelah deploy tersedia.
3. **Orang 3:** bangun `web/`; ini jalur kritis karena saat ini pengguna tidak punya antarmuka apa pun.
4. **Orang 4:** perbaiki pelestarian byte PDF (`.gitattributes`), lengkapi env example, dokumentasi, video script, dan bahan submit.
5. **Semua:** baru uji alur dari browser dan demo online. Jangan menyebut “selesai” hanya karena unit test lulus.

# 13. Cara melaporkan masalah tanpa panik

Salin format ini ke progres orang yang bertanggung jawab:

```text
Tanggal:
Perintah/halaman:
Yang saya harapkan:
Yang benar-benar terjadi:
Pesan error lengkap:
Sudah pernah berhasil sebelumnya? ya/tidak:
Perubahan terakhir yang saya lakukan:
```

Jangan menyertakan private key, seed phrase, atau isi `.env`.

# 14. Arti status deal

| Status | Arti |
|---|---|
| `Proposed` | Pembeli membuat deal; penjual belum menyetujui. |
| `Approved` | Penjual setuju; pembeli belum menyetor jaminan penuh. |
| `Active` | Jaminan penuh sudah masuk; cicilan dapat dibayar/ditagih. |
| `needs_top_up=true` | Bukan status terpisah. Deal masih Active, tetapi jaminan kurang dan pembeli harus mengisinya kembali. |
| `Defaulted` | Cicilan telat dan jaminan tidak cukup. Tidak ada alur sengketa/pemulihan dalam versi ini. |
| `Completed` | Semua cicilan sudah lunas. Sisa jaminan dapat ditarik pembeli. |
| `Resold` | Deal pertama sudah selesai dan pemain telah dijual lagi serta pembayaran resale sudah diterima. |
| `pending` payout | Transfer ke penerima gagal; uang dicatat untuk diklaim, bukan dianggap hilang. |

# 15. Kesimpulan jujur untuk tim

Yang sudah bisa dipercaya dari hasil tes: **aturan hitungan kontrak dan Reader bekerja dengan baik pada tes lokal, dan live AI Reader berhasil.**

Yang belum bisa diklaim: **aplikasi sudah bisa dipakai pengguna, kontrak sudah live di testnet, transaksi explorer sudah terbukti, Collector aman di jaringan nyata, dan demo juri sudah berjalan.**

Gunakan hasil ini sebagai dasar pembagian kerja berikutnya, bukan sebagai alasan menyalahkan anggota. Repo diaudit dalam keadaan masih berkembang dan ada perubahan lokal yang belum di-commit.
