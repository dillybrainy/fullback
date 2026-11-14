# Review dan optimasi performa FULLBACK

Scope: delapan route frontend, aset, client boundaries, cache, dan jalur hosting. Revisi akses terbaru membuka tiga route publik dan menutup lima route workspace sampai login tersedia; lihat [ACCESS-AND-PREVIEW.md](ACCESS-AND-PREVIEW.md). Tidak ada API reader, RPC, transaksi, database, atau autentikasi server saat pengukuran. Tidak ada throughput atau kapasitas hosting yang diklaim telah diuji.

## Hasil terukur

Baseline dibangun ulang dari snapshot Git HEAD sebelum optimasi dalam direktori lokal terpisah. Kedua build memakai Next.js, Node, dan mesin yang sama. Lihat [performance-results.json](performance-results.json).

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| Route produk yang diprerender | 5 dari 8 | 8 dari 8 |
| Route produk yang dirender per request | 3 | 0 |
| Foto PNG di public | 18.512 MB | 0 |
| Seluruh varian foto WebP di public | — | 1.003 MB |
| Seluruh chunk JavaScript, gzip per file | 194,255 byte | 233,976 byte |

Perbandingan foto adalah ukuran berkas sumber/deployment. Sebelum optimasi, Next Image juga mengompresi gambar saat request, sehingga angka ini **bukan** bukti pengurangan bandwidth kunjungan sebesar 94.6%. Sesudah optimasi, format/ukuran dipilih browser dari varian yang sudah dibuat, tanpa image optimizer pada origin. Hero mobile 480px berukuran 6,152 byte. Kualitas WebP 82 mempertahankan foto yang sama, dengan kompresi lossy.

Angka JavaScript mencakup seluruh chunk yang dihasilkan, bukan hanya JS awal satu halaman. Sebelum revisi GSAP, output terbaru 192,590 byte; sesudahnya 240,404 byte: tambahan bersih 47,814 byte gzip (+24.8%). Chunk Home motion sendiri 48,846 byte gzip, ditunda sampai Home terhidrasi dan motion diizinkan. Browser offline memverifikasi chunk tidak diminta saat reduced motion aktif sejak awal atau kunjungan ke non-Home sesudah landing. Ini tradeoff ukuran untuk koreografi yang diminta, bukan penghematan JS. Tidak ada klaim perbaikan LCP, INP, latensi, CPU, atau request/detik tanpa pengukuran deployment. Rincian: [MOTION.md](MOTION.md).

Angka GSAP di atas adalah checkpoint historis. Sesudah penutupan workspace dan revisi preview, output terbaru 233,976 byte gzip dalam 15 file, turun 6,428 byte dari checkpoint tersebut. Seluruh delapan route tetap diprerender, termasuk halaman akses tertutup; komponen workspace tidak lagi diimpor oleh entry page. Foto tetap 1,002,870 byte untuk seluruh varian. Font desain kini menggunakan next/font/local dengan hash dan preload. JSON menyimpan beforeAccessRevision agar dua scope pengukuran tidak tercampur.

## Perubahan

- Dashboard membaca query peran/tab di client dalam Suspense. Query tidak lagi menyebabkan HTML dirender per request.
- Detail deal dan resale menggunakan generateStaticParams dan dynamicParams=false. ID yang tidak dikenal tidak memicu pembuatan halaman contoh baru.
- build:static menghasilkan out/ untuk CDN/static hosting, tanpa proses Node saat melayani halaman.
- Foto memiliki varian WebP bernama hash. PNG sumber dipindahkan ke design-assets/, di luar public, termasuk salinan hero lama yang tidak lagi dilayani. Semua varian dijaga oleh tes budget 1.5 MB.
- Gambar khusus desktop memakai picture dengan source media min-width; fallback mobile berupa piksel lokal dalam data URI. Mobile tidak memilih berkas foto yang disembunyikan tersebut. Lazy loading dan dimensi intrinsik dipertahankan.
- Komponen ikon SVG menggunakan img sederhana. Foto sign-in berada di server component; pilihan peran saja yang menjadi client component.
- FAQ memakai disclosure HTML native pada mobile, dan artikel statis pada desktop. Tidak memerlukan hydration atau subscription media query.
- Media bernama hash memperoleh cache immutable satu tahun pada mode Next server. Font memakai cache satu hari agar nama berkas tetap dapat diperbarui. HTML/RSC tetap mengikuti kebijakan Next; tidak ada pemaksaan public cache terhadap seluruh route.
- Header nosniff, frame denial, dan referrer policy ditambahkan. Static export menerapkannya melalui hosting, bukan next.config.

## Menjalankan

```powershell
npm.cmd run build -w web
npm.cmd test -w web
npm.cmd run lint -w web
npm.cmd run typecheck -w web
npm.cmd run perf:report -w web
```

Untuk deployment frontend saat ini yang seluruh kontennya publik/contoh:

```powershell
npm.cmd run build:static -w web
```

Publikasikan **isi web/out/** ke static host/CDN. Konfigurasi contoh: [deploy/nginx-static.conf](deploy/nginx-static.conf). Build normal tetap tersedia untuk Vercel Next preset atau server Node; konfigurasi reverse proxy: [deploy/nginx.conf](deploy/nginx.conf). Config tersebut adalah template yang belum dipasang atau diuji nginx -t pada host deployment.

Gunakan salah satu profil deployment per build. build:static menulis konfigurasi export ke .next; jalankan build normal lagi sebelum memakai next start. Folder out berisi snapshot dan tidak otomatis dihapus oleh build normal.

File PNG asli ada di design-assets/. Untuk regenerasi varian setelah foto berubah:

```powershell
npm.cmd run assets:prepare -w web
```

Perintah memakai sharp dari toolchain Next yang terpasang. Sertakan manifest lib/photos.json dan varian public/media dalam perubahan. File bernama hash lama boleh dipertahankan selama masa cache/CDN; jangan mengganti isi suatu URL immutable.

## Ketahanan request: konfigurasi yang harus diaktifkan saat deploy

1. Tempatkan CDN/WAF di depan origin dan batasi akses langsung ke origin. Deploy static adalah jalur paling sederhana untuk frontend ini.
2. Aktifkan aturan WAF pada Vercel atau CDN pilihan. Gunakan rate limit terpisah untuk halaman, bot, dan endpoint mahal. Fitur dan harga mengikuti plan provider. [Dokumentasi WAF rate limiting Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
3. Template Nginx menyediakan limit 20 request/detik/IP dengan burst 40, timeout, batas body 1 MB dan 429. Angka ini titik awal operasional, **bukan kapasitas yang telah dibuktikan**. Template Node juga membatasi koneksi per IP.
4. Saat proxy/CDN dipakai, konfigurasi trusted real-IP CIDR sesuai provider. Tanpa itu semua pengunjung bisa dianggap satu alamat proxy. Jangan mempercayai header IP yang bisa dikirim pengunjung.
5. Template menutup /api/ dan /_next/image karena frontend tidak membutuhkannya. Pada Vercel, jangan menganggap template Nginx otomatis berlaku: pasang aturan WAF di project sendiri.
6. Jika integrasi backend ditambahkan, tinjau ulang static export, kebijakan cache, dan penutupan /api/. Gunakan limiter terdistribusi di gateway sebelum memanggil AI/RPC, batas ukuran dan autentikasi, timeout, batas concurrency, retry terbatas dengan jitter, serta idempotency untuk transaksi. Request privat tidak boleh masuk cache publik. Jangan memakai Map per proses sebagai perlindungan lintas instance.

Konfigurasi hosting tidak diaktifkan otomatis dan belum ada bukti ketahanan DDoS. Cache mengurangi kerja origin; kapasitas CDN, bandwidth, biaya, dan bot terdistribusi tetap perlu diukur dan dipantau.

## Load test manual

Install k6 sesuai [panduan resminya](https://grafana.com/docs/k6/latest/set-up/install-k6/). Jalankan hanya terhadap deployment yang dimiliki/diizinkan dan sesuaikan anggaran trafik.

```powershell
$env:BASE_URL = "https://deployment-milikmu.example"
$env:RATE = "20"
$env:DURATION = "30s"
k6 run --summary-export=web/load-results.json web/tests/load.k6.js
```

Script tidak dijalankan otomatis. Target wajib diberikan, laju dibatasi 1–1000 request/detik, dan max VU 200. Naikkan laju bertahap sambil memantau p95/p99, error, dropped iterations, CDN hit ratio, origin RPS, CPU, memori, dan biaya. Target awal script: error <1%, p95 <500ms, p99 <1500ms, tanpa dropped iterations.

Pisahkan pengujian cold cache dan warm cache. Script mencampur dokumen HTML; itu tidak meniru seluruh aset/browser, traffic RSC navigasi, API, wallet, atau serangan terdistribusi. Tambahkan skenario tersebut saat integrasi tersedia. Deployment preview yang memerlukan login akan gagal status 200; gunakan lingkungan uji yang memang diizinkan diakses load generator.

Satu juta request/hari rata-rata 11.57 request/detik; satu juta/menit 16,667/detik. Rata-rata tidak menggambarkan burst. Klaim kapasitas memerlukan durasi, distribusi trafik, cache state, region generator, tingkat error dan metrik deployment.

## Verifikasi yang dijalankan

- Build normal dan static export berhasil.
- 38 unit test lolos, termasuk integritas hash/ukuran semua foto, budget foto, artifact prerender seluruh route, race import motion, payload prefetch export Windows, penutupan HTML/RSC privat, preload font, dan case aset.
- ESLint dan TypeScript lolos.
- Render statis beranda diperiksa offline pada 1440/390px: foto termuat, tidak ada overflow horizontal, FAQ native dapat dibuka. Pemeriksaan ini tidak menjalankan hydration/dashboard routing atau mengukur jaringan.
- Server lokal tidak dinyalakan. k6, Nginx, CDN/WAF dan load test deployment belum dijalankan.
- Revisi GSAP diuji memakai HTML/bundle produksi dari static export: hydration, hero, touchline scroll, empat penerima, Replay keyboard, reduced motion langsung/live, resize 768/320px, navigasi keluar Home dan kembali. Request dipenuhi dari disk melalui Playwright tanpa server/jaringan. Pengujian tidak menggantikan pengukuran performa perangkat nyata. Animasi tidak menyimulasikan transaksi on-chain.
