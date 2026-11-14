# Panduan development, tes, dan deploy FULLBACK

Optimasi terbaru, dua pilihan hosting (Next server atau static CDN), konfigurasi rate limit, hasil pengukuran, dan load test manual tersedia di [PERFORMANCE.md](PERFORMANCE.md).

Semua perintah di bawah dijalankan sendiri saat diperlukan. Tidak ada server yang otomatis dinyalakan oleh unit test, lint, typecheck, atau build.

Aturan terbaru: hanya Home, Sign in, dan Verify yang publik; halaman privat ditutup sementara. Checklist konsistensi preview Chrome dan tes akses offline: [ACCESS-AND-PREVIEW.md](ACCESS-AND-PREVIEW.md).

Pengunjung baru masuk ke landing `/` dahulu, sekali per sesi browser, termasuk jika URL pertama `/verify` atau `/signin`. Next dev/server menggunakan redirect 307; static export menggunakan gate browser dengan fallback Home tanpa JavaScript. Sesudah mengubah `next.config.ts`, restart server dev yang sudah berjalan agar aturan server baru aktif. Uji alur melalui `npm.cmd run test:entry -w web` sesudah build:static, tanpa menyalakan server.

## Prasyarat

- Node.js 20.9 atau lebih baru, sesuai `web/package.json`. Gunakan versi yang sama di lokal dan hosting.
- npm dan checkout repository lengkap, termasuk folder `web/public/`.
- Terminal PowerShell di root repository:

```powershell
cd D:\Hackathon\fullback
node --version
npm.cmd --version
```

Frontend saat ini tidak membutuhkan `.env`, wallet, atau API key. Dashboard memakai data contoh. PDF hanya dihitung fingerprint-nya di browser; AI reader, perbandingan on-chain, dan transaksi belum terhubung.

## 1. Pasang dependency frontend

Dari root repository:

```powershell
npm.cmd ci --workspace web
```

Perintah ini menggunakan `package-lock.json` root, yang sudah menyertakan GSAP. Untuk seluruh workspace tim/CI gunakan `npm.cmd ci` dari root.

## 2. Jalankan development lokal

Jalankan hanya ketika ingin membuka aplikasi:

```powershell
npm.cmd run dev -w web -- --hostname 127.0.0.1 --port 3000
```

Buka `http://localhost:3000`. Binding `127.0.0.1` membatasi akses ke komputer ini. Terminal tetap berjalan selama server digunakan.

Untuk menghentikan server, tekan **Ctrl+C** di terminal tersebut. Bila muncul konfirmasi `Terminate batch job`, jawab `Y`.

Jika port 3000 sedang dipakai, pilih port lain:

```powershell
npm.cmd run dev -w web -- --hostname 127.0.0.1 --port 3001
```

## 3. Jalankan unit test tanpa server

```powershell
npm.cmd test -w web
```

Runner menggunakan `node:test` bawaan Node, tanpa browser, koneksi wallet, API eksternal, atau proses server.

| File | Perilaku yang diuji |
|---|---|
| `tests/deal-view.test.mjs` | Pilihan awal peran/tab, kategori deal, nominal pembeli/penjual/akademi, filter status, pencarian federation, dan data yang tidak termutasi |
| `tests/pdf-fingerprint.test.mjs` | Vektor SHA-256, byte biner, perubahan isi, ekstensi, file kosong, batas 20 MiB, error pembacaan, dan Web Crypto yang tidak tersedia |
| `tests/home-motion-loader.test.mjs` | Reduced motion, import terlambat setelah unmount, perubahan preferensi cepat, dan kegagalan chunk |
| `tests/static-export-paths.test.mjs` | Nama payload prefetch Windows sesuai URL yang diminta router |
| `tests/performance.test.mjs` | Integritas/budget foto dan prerender seluruh route sesudah build |

Menjalankan satu file:

```powershell
node --test web/tests/deal-view.test.mjs
node --test web/tests/pdf-fingerprint.test.mjs
```

Unit test tidak membuktikan layout browser, animasi visual, login wallet, atau transaksi blockchain.

Untuk tes browser produksi tanpa menyalakan server, jalankan `npm.cmd run build:static -w web` lalu `npm.cmd run test:motion -w web`. Prasyarat Playwright/Chrome, cakupan, dan hasil tersedia di [MOTION.md](MOTION.md). Build static juga menambahkan nama payload prefetch portabel untuk output Windows; deploy seluruh isi `web/out/`.

## 4. Pemeriksaan sebelum deploy

```powershell
npm.cmd run lint -w web
npm.cmd test -w web
npm.cmd run build -w web
npm.cmd run typecheck -w web
```

Build menulis output ke `web/.next/` lalu selesai; tidak menyalakan server. Jalankan typecheck setelah build agar tipe route Next.js sudah dihasilkan.

## 5. Preview hasil production di komputer

Setelah build berhasil, jalankan secara manual:

```powershell
npm.cmd run start -w web -- --hostname 127.0.0.1 --port 3000
```

Buka `http://localhost:3000`, lalu tekan **Ctrl+C** untuk menghentikannya. `start` membutuhkan build yang berhasil; gunakan `dev` selama menyunting kode.

## 6. Deploy preview/development ke Vercel

Deploy dilakukan sendiri dari akun Vercel. Panduan ini tidak mempublikasikan aplikasi.

1. Pastikan perubahan frontend, aset lokal, dan lockfile yang sinkron sudah tersedia di repository remote.
2. Di Vercel, buat/import project dari repository FULLBACK.
3. Pilih **Framework Preset: Next.js** dan **Root Directory: web**. Vercel mendukung pemilihan project dari subfolder monorepo. [Dokumentasi monorepo Vercel](https://vercel.com/docs/monorepos)
4. Gunakan build command `npm run build` yang dijalankan dari `web/`; biarkan output directory mengikuti preset Next.js.
5. Biarkan deteksi instalasi npm workspace menggunakan lockfile root. Jika build perlu membaca file di luar `web/`, aktifkan **Include source files outside of the Root Directory in the Build Step** pada pengaturan Root Directory. [FAQ monorepo Vercel](https://vercel.com/docs/monorepos/monorepo-faq)
6. Samakan versi Node dengan versi lokal yang sudah diuji. Frontend contoh saat ini tidak memerlukan environment variable.
7. Gunakan deployment preview untuk review perubahan, lalu buka URL yang diberikan Vercel.

Build normal menggunakan preset Next.js. Untuk static hosting tanpa proses Node, frontend contoh saat ini juga mendukung `npm.cmd run build:static -w web`: deploy isi `web/out/`, dengan cache dan header diatur pada hosting. Jangan mengunggah folder `.next` sebagai website statis biasa. Pilihannya dijelaskan di [PERFORMANCE.md](PERFORMANCE.md). [Dokumentasi deployment Next.js](https://nextjs.org/docs/app/getting-started/deploying)

## 7. Pemeriksaan setelah deploy

- Buka `/`, `/signin`, `/dashboard`, `/dashboard?role=academy`, dan `/federation`.
- Buka langsung `/deals/riverside-kingsport`, `/deals/new`, `/verify`, serta `/deals/riverside-kingsport/resale`; refresh masing-masing route.
- `/`, `/signin`, dan `/verify` harus terbuka. Semua URL dashboard/deal/federation harus menuju Sign in; tanpa JavaScript hanya menampilkan akses tertutup, bukan data workspace.
- Periksa foto/font lokal termuat, menu Home/mobile, FAQ, dan Back to Home. Tidak boleh ada tombol Explore yang melewati login.
- Unggah PDF contoh di `/verify`: hash harus tampil, sedangkan status tetap belum diverifikasi on-chain.
- Gunakan HTTPS pada deployment. Web Crypto untuk fingerprint memerlukan secure context; development lokal dapat memakai localhost.
- Wallet dan transaksi yang belum terhubung harus tetap ditandai belum tersedia.

## Troubleshooting

| Gejala | Tindakan |
|---|---|
| PowerShell memblokir `npm.ps1` | Gunakan `npm.cmd` seperti contoh di atas |
| `EADDRINUSE` | Hentikan terminal server lama atau pilih port 3001 |
| `Could not find a production build` | Jalankan `npm.cmd run build -w web` sebelum `start` |
| Unit test gagal | Baca nama kasus dan assertion; server tidak perlu dinyalakan |
| Fingerprint meminta HTTPS/localhost | Gunakan localhost atau URL HTTPS, bukan alamat IP LAN melalui HTTP |
| Foto atau font hilang setelah deploy | Pastikan `web/public/images/`, `web/public/media/`, dan sumber `web/public/fonts/` ikut checkout; deploy seluruh output dari satu build, termasuk `_next/static/media` |
| Vercel menjalankan project yang salah | Periksa Root Directory harus `web` dan preset Next.js |
