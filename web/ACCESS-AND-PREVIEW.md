# Akses publik dan konsistensi preview

Keputusan pengguna: hanya Home, Sign in, dan Verify PDF yang publik. Halaman aplikasi **ditutup sementara**, sampai integrasi login wallet tersedia. Tidak ditambahkan login contoh, cookie autentikasi buatan, atau jalur Explore yang melewati login.

Aturan masuk terbaru: **kunjungan pertama ke URL halaman apa pun harus melalui landing `/`, sekali per sesi browser**. Sesudah landing terbuka, aturan publik/privat pada tabel berlaku seperti biasa. Ini penanda kunjungan, bukan sesi login.

| Route | Perilaku sekarang |
|---|---|
| `/` | Landing kanonis; menu Home, logo, serta Back to Home kembali ke sini |
| `/signin` | Informasi login belum tersedia; wallet dan pilihan peran nonaktif; Home/Verify tetap tersedia |
| `/verify` | Fingerprint PDF lokal, tanpa login atau pengiriman file |
| `/dashboard` | Akses ditutup; diarahkan ke `/signin?next=%2Fdashboard` |
| `/deals/new` | Akses ditutup; diarahkan ke Sign in |
| `/deals/riverside-kingsport` | Akses ditutup; diarahkan ke Sign in |
| `/deals/riverside-kingsport/resale` | Akses ditutup; diarahkan ke Sign in |
| `/federation` | Akses ditutup; diarahkan ke Sign in |

## Cara penutupan bekerja

Entry page privat hanya merender `ClosedWorkspace`, tanpa memanggil atau meneruskan komponen workspace sebagai children. HTML dan payload RSC hasil export tidak memuat detail deal, data klub, atau dashboard yang disembunyikan dengan CSS. Setelah landing dikunjungi, JavaScript mengarahkan URL privat ke Sign in dengan `router.replace`. Pada static hosting, respons awal berupa pemberitahuan mulai dari Home; tanpa JavaScript, meta refresh membawa pengguna ke Home. Ini bukan autentikasi server.

`next.config.ts` memberi redirect HTTP 307 untuk request dokumen halaman yang belum memiliki cookie `fullback_landing_seen=1`. Root, API, aset, HMR, RSC, prefetch, serta Server Actions dikecualikan. Cookie ditulis hanya setelah landing terbuka, tanpa tanggal kedaluwarsa sehingga mengikuti sesi browser; tidak berisi identitas/peran dan tidak membuka workspace. Static export menggunakan `LandingEntry` pada layout sebagai fallback browser, karena static host tidak menjalankan hook redirects Next. Jika cookie diblokir, navigasi client setelah Home tetap bisa berjalan menggunakan penanda dalam memori. Root selalu bisa dibuka sehingga tidak terjadi redirect loop.

Nilai localStorage, cookie, query role, dan query `authenticated=true` tidak membuka akses. `next` hanya menyimpan tujuan internal; tidak ada proses login atau redirect ke nilai `next` dari pengguna. Menu publik tidak menampilkan akun contoh. Tautan produk privat pada footer langsung menuju Sign in, tanpa mengundang pengguna masuk ke workspace contoh.

Kode tampilan lama disimpan di `components/workspaces/`, serta komponen dashboard yang sudah ada. Kode tersebut tidak diimpor oleh route privat yang ditutup. Jangan mengaktifkannya dengan sebuah boolean localStorage. Integrasi berikutnya harus menyediakan autentikasi/otorisasi nyata sebelum melayani data privat atau menerima aksi. Static export tetap tersedia untuk keadaan tertutup ini.

## Perubahan preview

- Schibsted Grotesk tetap font desain pada bobot 400/500/600. `next/font/local` memaketkan, memberi nama hash, dan melakukan preload dari berkas lokal yang sama. Fallback memakai metrik yang disesuaikan; tidak mengambil font dari Google/CDN.
- Font synthesis dinonaktifkan agar browser tidak membuat bobot palsu. Text autosizing memakai 100%, sementara zoom dan preferensi aksesibilitas pengguna tetap dapat digunakan.
- Grid sign-in memakai kolom yang boleh menyusut dan ukuran minimum yang eksplisit. Navigasi beralih ke menu pada lebar 1040px agar tautan Home/Verify tidak berdesakan di laptop sempit.
- CSS responsif, foto, warna, dan hierarki Figma dipertahankan. Foto tetap lazy-load dalam produk; harness visual memuat/decode foto sebelum mengambil screenshot seluruh halaman.
- Tes aset memeriksa nama berkas secara persis, termasuk case, meskipun dijalankan di filesystem Windows yang biasanya tidak membedakan case.
- Template static Nginx mengutamakan `route.html` dibanding direktori payload RSC dan menormalkan trailing slash. Template belum diaktifkan atau diuji dengan Nginx pada host deployment.

Pengguna mengonfirmasi semua pengujian mereka memakai Chrome. Detail viewport, zoom, versi Chrome, sistem operasi, dan contoh visual yang berbeda belum diberikan; penyebab spesifik pada komputer tersebut belum bisa dipastikan. Perubahan ini menangani pemuatan font, navigasi, breakpoint, dan integritas aset yang dapat diperiksa di repo. Zoom/DPR berbeda tidak berarti lebar viewport CSS sama. Untuk perbandingan, gunakan release/URL yang sama, viewport CSS yang sama, dan tunggu font/foto termuat. Jangan mematikan zoom pengguna untuk memaksa kemiripan.

## Pengujian tanpa server

```powershell
npm.cmd ci --workspace web
npm.cmd run build:static -w web
npm.cmd test -w web
npm.cmd run test:access -w web
npm.cmd run test:motion -w web
npm.cmd run test:entry -w web
npm.cmd run lint -w web
npm.cmd run typecheck -w web
```

Harness menggunakan Chrome lokal dan Playwright di `web/.qa/node_modules/playwright`, seperti [panduan motion](MOTION.md). Pada checkout baru: `npm.cmd install --prefix web/.qa --no-save --package-lock=false playwright`. Atur `CHROME_PATH` jika perlu. Edge juga diperiksa bila tersedia. Semua request browser dipenuhi dari `web/out` melalui intersepsi, tanpa proses server lokal dan tanpa meneruskan request ke internet.

Hasil pengujian:

- 42 unit test lolos, termasuk redirect dokumen pertama melalui matcher Next yang asli, pengecualian API/aset/HMR, HTML/RSC privat, tujuan Sign in yang aman, case aset, dan tiga preload font di setiap halaman publik.
- Chrome DPR 1x/2x: tiga halaman publik pada 320, 390, 700, 701, 768, 900, 1024, 1280, 1440, 1920, dan 2560px. Geometri judul sama dalam toleransi 1 CSS pixel untuk viewport yang sama; font desain benar-benar termuat.
- Edge DPR 1x juga lolos pada matriks yang sama. Ini pengujian browser di mesin lokal, bukan bukti pengujian fisik pada semua komputer pengguna.
- Direct URL privat, refresh, cookie/localStorage sesi palsu, parameter role, JavaScript nonaktif, Home link, keyboard/Escape, back, dan 404 diperiksa.
- Hero, touchline proses, payment split, Replay keyboard, reduced motion, resize, dan cleanup navigasi tetap lolos.
- `test:entry` memeriksa sesi baru pada tujuh URL, cookie sesi, akses Verify/refresh setelah landing, workspace tetap tertutup, cookie diblokir, dan fallback tanpa JavaScript. Tidak ada redirect loop.
- Build normal dan static export tetap menghasilkan delapan route produk yang diprerender. Screenshot: `web/.qa/public-access/` dan `web/.qa/gsap/`.

Output JavaScript keseluruhan sesudah revisi: 233,976 byte gzip dalam 15 file, dibanding 240,404 byte/17 file sebelumnya. Ini ukuran seluruh chunk, bukan transfer awal satu halaman. Sumber angka dan batas pengukuran: [PERFORMANCE.md](PERFORMANCE.md).

## Memakai build yang sama di komputer lain

Gunakan lockfile root dan `npm ci --workspace web`. Untuk hosting statis, deploy **seluruh isi `web/out/` dari satu build yang sama**, termasuk `_next/`, `media/`, `images/`, file HTML, dan payload `.txt`; jangan mencampur output lama dan baru atau menyalin HTML saja. Untuk preset Next.js, deploy source dan build Next, bukan isi `out` sebagai source aplikasi. Font sumber di `public/fonts` harus ikut checkout; font runtime berada pada nama hash di `_next/static/media`.

Saat release berubah, HTML perlu revalidasi dan aset bernama hash boleh immutable. Hindari cache HTML lama yang menunjuk chunk release yang sudah dibuang. Gunakan preview deployment yang sama saat membandingkan antar komputer. Panduan hosting: [DEPLOYMENT.md](DEPLOYMENT.md).
