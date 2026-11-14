# Panduan development, tes, dan deploy FULLBACK

Semua perintah di bawah dijalankan sendiri saat diperlukan. Tidak ada server yang otomatis dinyalakan oleh unit test, lint, typecheck, atau build.

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
npm.cmd install --workspace web --package-lock=false
```

Perintah ini tidak memperbarui lockfile bersama. Untuk instalasi tim/CI yang reproducible, gunakan `npm.cmd ci` setelah `package-lock.json` root dipastikan sudah sinkron dengan seluruh workspace. Jika `npm ci` melaporkan lockfile tidak sinkron, koordinator perlu memperbarui dan menyertakan lockfile bersama.

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

Menjalankan satu file:

```powershell
node --test web/tests/deal-view.test.mjs
node --test web/tests/pdf-fingerprint.test.mjs
```

Unit test tidak membuktikan layout browser, animasi visual, login wallet, atau transaksi blockchain.

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

App ini memiliki route yang memerlukan runtime Next.js. Gunakan hosting Next.js/Node; jangan mengunggah folder `.next` sebagai website statis biasa. Build lalu `next start` merupakan alur server Node yang didukung Next.js. [Dokumentasi deployment Next.js](https://nextjs.org/docs/app/getting-started/deploying)

## 7. Pemeriksaan setelah deploy

- Buka `/`, `/signin`, `/dashboard`, `/dashboard?role=academy`, dan `/federation`.
- Buka langsung `/deals/riverside-kingsport`, `/deals/new`, `/verify`, serta `/deals/riverside-kingsport/resale`; refresh masing-masing route.
- Periksa foto dan font lokal termuat, menu mobile, FAQ, tab, filter, dan pencarian.
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
| Foto atau font hilang setelah deploy | Pastikan `web/public/images/` dan `web/public/fonts/` ikut di repository |
| Vercel menjalankan project yang salah | Periksa Root Directory harus `web` dan preset Next.js |
