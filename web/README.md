# FULLBACK frontend

Panduan lengkap development, unit test, preview production, dan deploy Vercel: [DEPLOYMENT.md](DEPLOYMENT.md).

Review performa, hasil pengukuran, static export/CDN dan load test: [PERFORMANCE.md](PERFORMANCE.md). Seluruh route contoh kini diprerender; foto responsif WebP disiapkan sebelum deployment.

**Akses saat ini:** hanya `/`, `/signin`, dan `/verify` yang publik. Dashboard, deal, resale, dan federation ditutup sampai login wallet tersedia; URL langsung diarahkan ke Sign in tanpa merender isi workspace. Aturan akses, perbaikan preview, dan tes Chrome: [ACCESS-AND-PREVIEW.md](ACCESS-AND-PREVIEW.md).

Kunjungan pertama ke URL halaman apa pun masuk ke landing `/` terlebih dahulu, sekali per sesi browser. Sesudahnya halaman publik dapat digunakan; penanda kunjungan tidak memberikan akses login.

Animasi beranda mengadaptasi inspirasi HelloNear ke tema FULLBACK: kick-off hero, touchline empat langkah mengikuti scroll, dan satu pembayaran bercabang ke empat penerima dengan Replay. Nominal tetap diam dan layout Figma dipertahankan. GSAP dimuat khusus Home saat motion diizinkan. Resep, pengujian browser tanpa server, dan ukuran bundle: [MOTION.md](MOTION.md).

Frontend Next.js App Router dengan TypeScript dan CSS, mengikuti [desain FULLBACK](https://www.figma.com/design/554rVc9k58NLyfZ1ygdDIY?node-id=0-1). Beranda, sign in, dashboard, detail deal, unggah PDF, verifikasi, resale, dan federation memakai foto, logo, font Schibsted Grotesk, warna, dan struktur dari Figma. Font dan gambar disimpan lokal di `public/`.

Navigasi publik, menu mobile, FAQ, drag-and-drop PDF di Verify, dan fingerprint SHA-256 berfungsi. Pilihan peran nonaktif selama login belum tersedia. Prototype tab/filter/pencarian workspace disimpan untuk integrasi berikutnya. Ilustrasi notifikasi royalti mengikuti ketukan akhir proses. Semua animasi menghormati `prefers-reduced-motion`.

Dashboard dan detail deal memakai data contoh netral dari `lib/mock.ts`. Koneksi dompet, Pembaca AI, verifikasi on-chain, dan transaksi belum tersedia; kontrol terkait menampilkan batasan tersebut. Fase 2 belum ditambahkan.

## Halaman yang bisa dicoba

- `/`: beranda.
- `/signin`: login belum tersedia; Home dan Verify dapat diakses. Tidak ada jalur Explore tanpa login.
- `/dashboard`, `/deals/new`, `/deals/riverside-kingsport`: sementara ditutup.
- `/verify`: pilih PDF dan hitung SHA-256 di browser tanpa mengunggah file. Hasil belum dibandingkan dengan kontrak testnet.
- `/deals/riverside-kingsport/resale`, `/federation`: sementara ditutup.

Contoh memiliki dua cicilan terbayar, termasuk satu dari jaminan, sehingga statusnya “Must top up”. Tanggal hanya ilustrasi. Tidak ada transaksi blockchain atau link explorer buatan.

## Menjalankan di Windows PowerShell

Butuh Node.js 20.9 atau lebih baru. Jalankan dari folder utama `fullback`:

```powershell
npm.cmd ci --workspace web
npm.cmd run dev
```

Buka http://localhost:3000. Tekan `Ctrl+C` di terminal untuk menghentikan server.

`npm.cmd` dapat digunakan jika PowerShell memblokir `npm.ps1`.
Dependency frontend, termasuk GSAP, terkunci di `package-lock.json` root.

## Pemeriksaan

```powershell
npm.cmd run lint -w web
npm.cmd run build -w web
npm.cmd run typecheck -w web
npm.cmd test -w web
```

Untuk menjalankan hasil build:

```powershell
npm.cmd run start -w web
```

## File utama

- `app/page.tsx`: isi halaman beranda.
- `app/layout.tsx`: kerangka halaman, bahasa, dan judul browser.
- `app/globals.css`: token Figma, tampilan, animasi, dan aturan layar kecil.
- `components/dashboard-workspace.tsx`: tab, filter, peran, dan data dashboard.
- `components/faq-list.tsx`: accordion mobile.
- `components/royalty-notification.tsx`: markup statis ilustrasi receipt.
- `lib/home-motion.mjs`: koreografi GSAP; `home-motion-loader.mjs` menangani lazy load dan lifecycle.
- `next.config.ts`: konfigurasi Next.js.

Next.js akan mengelola file `next-env.d.ts` secara otomatis. Halaman awal tidak membutuhkan `.env` atau kunci akun.

## Mencoba sidik jari PDF

1. Buka `http://localhost:3000/verify` lalu pilih file `.pdf` yang tidak kosong.
2. Sidik jari SHA-256 tampil dan bisa disalin dari kotak teks. File tidak dikirim ke server.
3. Memilih file yang sama lagi menghasilkan sidik jari yang sama. Mengganti nama file saja tidak mengubah hasil; mengubah isi byte file akan mengubah sidik jarinya.
4. Hasil masih berstatus belum diverifikasi terhadap kontrak. Fungsi ini tidak memeriksa keabsahan isi atau tanda tangan PDF.

Gunakan localhost atau HTTPS. Alamat jaringan melalui HTTP biasa mungkin tidak menyediakan Web Crypto yang diperlukan.

## Verifikasi tampilan

Implementasi diperiksa di Chrome lokal pada 1440 dan 390 px untuk seluruh delapan route, serta pemeriksaan overflow pada 320, 768, 1280, dan 1600 px. Pemeriksaan interaksi mencakup menu mobile, pemilihan peran, tab/filter, pencarian, FAQ, fingerprint PDF dan error file kosong, keterbacaan angka mobile, serta animasi dan reduced-motion.

Perbedaan dari mockup: angka dan tanggal berasal dari data contoh yang sudah ada, statistik federation dihitung dari satu contoh tersebut, dan fitur yang memerlukan wallet/kontrak ditampilkan sebagai belum tersedia.
