# FULLBACK frontend

Panduan lengkap development, unit test, preview production, dan deploy Vercel: [DEPLOYMENT.md](DEPLOYMENT.md).

Frontend Next.js App Router dengan TypeScript dan CSS, mengikuti [desain FULLBACK](https://www.figma.com/design/554rVc9k58NLyfZ1ygdDIY?node-id=0-1). Beranda, sign in, dashboard, detail deal, unggah PDF, verifikasi, resale, dan federation memakai foto, logo, font Schibsted Grotesk, warna, dan struktur dari Figma. Font dan gambar disimpan lokal di `public/`.

Navigasi mobile, menu akun, pilihan peran, tab, filter status, pencarian federation, FAQ mobile, drag-and-drop PDF, dan fingerprint SHA-256 sudah berfungsi. Notifikasi royalti muncul sekali saat terlihat; menu dan perubahan state memakai transisi singkat. Semua animasi menghormati `prefers-reduced-motion`.

Dashboard dan detail deal memakai data contoh netral dari `lib/mock.ts`. Koneksi dompet, Pembaca AI, verifikasi on-chain, dan transaksi belum tersedia; kontrol terkait menampilkan batasan tersebut. Fase 2 belum ditambahkan.

## Halaman yang bisa dicoba

- `/`: beranda.
- `/signin`: pilihan peran Club, Academy, atau Federation, dengan tautan ke workspace contoh.
- `/dashboard`: pilih klub contoh dan kategori Selling, Buying, atau Academy royalties.
- `/deals/new`: unggah atau drop PDF dan hitung fingerprint lokal; ekstraksi AI belum terhubung.
- `/deals/riverside-kingsport`: cicilan, jaminan, dan pembagian pembayaran contoh.
- `/verify`: pilih PDF dan hitung SHA-256 di browser tanpa mengunggah file. Hasil belum dibandingkan dengan kontrak testnet.
- `/deals/riverside-kingsport/resale`: ringkasan kewajiban sell-on.
- `/federation`: ringkasan dan tabel read-only.

Contoh memiliki dua cicilan terbayar, termasuk satu dari jaminan, sehingga statusnya “Must top up”. Tanggal hanya ilustrasi. Tidak ada transaksi blockchain atau link explorer buatan.

## Menjalankan di Windows PowerShell

Butuh Node.js 20.9 atau lebih baru. Jalankan dari folder utama `fullback`:

```powershell
npm.cmd install --workspace web --package-lock=false
npm.cmd run dev
```

Buka http://localhost:3000. Tekan `Ctrl+C` di terminal untuk menghentikan server.

`npm.cmd` dapat digunakan jika PowerShell memblokir `npm.ps1`.
Pemasangan di atas tidak memperbarui `package-lock.json` bersama di root. Koordinasikan pembaruan file tersebut dengan Orang 4 agar instalasi tim juga terkunci.

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
- `components/royalty-notification.tsx`: animasi notifikasi dengan reduced-motion.
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
