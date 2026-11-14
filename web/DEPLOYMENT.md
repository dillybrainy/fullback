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

Dashboard memakai data contoh. Di `/verify`, PDF dihitung fingerprint-nya di browser dan bisa direview AI Reader lewat `/api/reader` (butuh `NEARAI_API_KEY`, lihat bagian 6). Transaksi belum terhubung.

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
6. Samakan versi Node dengan versi lokal yang sudah diuji.
7. **Wajib aktifkan "Include source files outside of the Root Directory"**: `npm run build` di `web/` menjalankan `prebuild`, yang meng-compile AI Reader dari `agent/` ke `agent/dist`, lalu route `/api/reader` mem-bundle hasil itu.
8. Isi Environment Variables (Settings → Environment Variables) untuk AI Reader `/api/reader`:

   | Nama | Nilai |
   |---|---|
   | `NEARAI_API_KEY` | API key NEAR AI Cloud (rahasia, jangan di-commit) |
   | `NEARAI_MODEL` | **kosongkan**, supaya dipakai default kode `Qwen/Qwen3.6-35B-A3B-FP8` (private TEE) |
   | `DEMO_MODE` | `false` untuk membaca PDF apa pun secara live. `true` hanya menerima PDF demo (Lucas, OK-01, OK-02) tanpa LLM |
   | `READER_ALLOWED_ORIGINS` | opsional; domain lain yang boleh memanggil API. Domain deployment itu sendiri selalu diizinkan |
   | `READER_MAX_BYTES` | opsional; batas ukuran PDF untuk AI review dalam byte (default 20971520). Di Vercel isi `4000000` — platform menolak request body di atas 4,5 MB |

   Untuk **Judge demo mode** (`/demo`, route `/api/demo/*` dan `/api/collector/tick`), salin nilai dari `scripts/.env.demo` (ditulis `npm run setup:demo`). Kunci ini hanya dipakai di server dan tidak pernah dikirim ke browser:
   `NEAR_NETWORK=testnet`, `CONTRACT_ID`, `FT_ID`, `FT_OWNER_ACCOUNT_ID`, `FT_OWNER_PRIVATE_KEY`, `DEMO_SELLER_ACCOUNT_ID`, `DEMO_SELLER_PRIVATE_KEY`, `DEMO_BUYER_ACCOUNT_ID`, `DEMO_BUYER_PRIVATE_KEY`, `DEMO_RESALE_BUYER_ACCOUNT_ID`, `DEMO_RESALE_BUYER_PRIVATE_KEY`, `DEMO_ACADEMY_1_ACCOUNT_ID`, `DEMO_ACADEMY_2_ACCOUNT_ID`, `KEEPER_ACCOUNT_ID`, `KEEPER_PRIVATE_KEY` (kunci terbatas `settle_due`, **bukan** `KEEPER_FULL_ACCESS_PRIVATE_KEY`).
   Kalau salah satu kosong, `/demo` menampilkan "Judge demo mode is not configured on this deployment", tidak crash.

9. Gunakan deployment preview untuk review perubahan, lalu buka URL yang diberikan Vercel.

### Batasan platform yang jujur

- **Request body maksimal 4,5 MB** (batas Vercel) — itulah gunanya
  `READER_MAX_BYTES=4000000` di atas. UI menampilkan batas ini dari
  `GET /api/reader`; PDF yang lebih besar ditolak dengan pesan yang jelas.
  PDF teks perjanjian umumnya jauh di bawah 1 MB.
- **Durasi fungsi maksimal 60 detik** (`maxDuration` di route). Mode demo
  selesai dalam milidetik. Model live default (Qwen3.6, thinking nonaktif)
  umumnya selesai di bawah 60 detik; kalau melewati batas, route sudah diatur
  menjawab **error JSON yang menjelaskan** sebelum platform membunuh fungsi —
  bukan halaman timeout yang membingungkan.

Build normal menggunakan preset Next.js. Untuk static hosting tanpa proses Node, frontend contoh saat ini juga mendukung `npm.cmd run build:static -w web`: deploy isi `web/out/`, dengan cache dan header diatur pada hosting. Jangan mengunggah folder `.next` sebagai website statis biasa. Pilihannya dijelaskan di [PERFORMANCE.md](PERFORMANCE.md). [Dokumentasi deployment Next.js](https://nextjs.org/docs/app/getting-started/deploying)

## 7. Pemeriksaan setelah deploy

- Buka `/`, `/signin`, `/dashboard`, `/dashboard?role=academy`, dan `/federation`.
- Buka langsung `/deals/riverside-kingsport`, `/deals/new`, `/verify`, serta `/deals/riverside-kingsport/resale`; refresh masing-masing route.
- `/`, `/signin`, dan `/verify` harus terbuka. Semua URL dashboard/deal/federation harus menuju Sign in; tanpa JavaScript hanya menampilkan akses tertutup, bukan data workspace.
- Periksa foto/font lokal termuat, menu Home/mobile, FAQ, dan Back to Home. Tidak boleh ada tombol Explore yang melewati login.
- Unggah PDF contoh di `/verify`: hash harus tampil, sedangkan status tetap belum diverifikasi on-chain.
- `GET /api/reader` dari browser di domain itu harus mengembalikan `{"configured":true,"mode":"live",...}`. Di `/verify`, unggah `sample-agreements/tests/OK-01-basic.pdf` lalu klik **Review agreement with AI**: hasilnya tanpa warning. `BAD-01-installments-dont-add-up.pdf` harus memunculkan warning cicilan. Static export (`build:static`) tidak memuat `/api/reader`.
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
