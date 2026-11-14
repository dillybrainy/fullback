# Home motion FULLBACK

Implementasi memakai GSAP 3.15.1, Timeline, ScrollTrigger, dan CustomEase. Referensi rasa gerak: [HelloNear](https://hellonear.xyz/). Aset dan kode referensi tidak disalin. Warna, font, foto, copy, angka, hierarki, hero/footer selebar layar, dan overlay penutup tetap dipertahankan.

## Pilihan gerak

Tahap `find-animation-opportunities` hanya memilih momen. Implementasi dilanjutkan memakai `gsap-timeline` dan `gsap-scrolltrigger` sesuai instruksi pengguna.

| Lokasi | Sebelumnya | Tujuan | Frekuensi | Resep yang diterapkan |
|---|---|---|---|---|
| `app/page.tsx:35`, hero | Headline dua tahap, foto settle | Delight | Sekali saat memasuki Home | Bola kuning melintas 96px/270° selama 550ms; teks dari y 65%/opacity .6 ke posisi akhir selama 800ms, stagger 130ms; foto scale 1.035→1 selama 1300ms. Kurva desain `cubic-bezier(.16,1,.3,1)` melalui CustomEase. |
| `app/page.tsx:52`, How it works | Empat nomor tanpa hubungan gerak | Explanation | Mengikuti pembacaan section | Touchline dari nomor pertama ke terakhir; bola mengikuti scroll dengan scrub 150ms. Nomor beraksen kuning/scale 1.08 lalu kembali, tanpa menggerakkan teks. Rentang mulai nomor pertama di 78% viewport sampai nomor terakhir di 45%. Receipt bergeser 12px→0 pada ketukan keempat; tetap opak. |
| `app/page.tsx:56`, split diagram | Bola lewat bar, nominal ikut masuk | Explanation | Sekali; Replay atas permintaan | Bola masuk 500ms, lalu empat packet kuning bergerak pada gutter menuju swatch penerima; selang 90ms, perjalanan 670ms, swatch pulse 1→1.5→1. Total 1750ms. Semua nominal tetap diam dan terbaca. |

Gerak marketing boleh lebih panjang karena membantu menjelaskan urutan. Foto tetap memakai hover CSS pada perangkat hover/pointer presisi; tombol tetap memakai feedback warna/bayangan 160ms tanpa menggeser target klik. Tombol Replay mempertahankan fokus keyboard dan menandai `aria-disabled` selama playback untuk mencegah penumpukan.

Ditolak: fade-in semua section (tidak menambah penjelasan), idle bounce/marquee (berulang saat membaca), tombol magnetik (target berpindah), animasi nominal (mengganggu data), dan pinning/scroll hijacking (menghambat navigasi). Tidak ada drag/gesture baru; disclosure FAQ tetap native.

## Batas dan lifecycle

- `components/home-motion.tsx` memasang loader kecil. Engine beserta koreografi dimuat melalui dynamic import sesudah hydration, khusus Home. Reduced motion yang aktif sejak awal melewati unduhan ini.
- `lib/home-motion-loader.mjs` membuang hasil import yang datang setelah unmount atau perubahan preferensi. Kegagalan chunk mempertahankan halaman statis lengkap.
- `lib/home-motion.mjs` menggunakan matchMedia berscope Home; revert mengembalikan style dan menghapus timeline/ScrollTrigger. Listener, requestAnimationFrame refresh, atribut SVG buatan, dan kontrol Replay dibersihkan saat unmount.
- Motion lama WAAPI hero, payment, dan receipt dilepas. Receipt menjadi server component. CSS hover foto bekerja pada foto yang tidak dikendalikan GSAP.
- Reduced motion, termasuk perubahan saat halaman terbuka, menampilkan seluruh isi secara statis dan menyembunyikan dekorasi/Replay. Tidak ada idle loop, timer playback berulang, smooth-scroll engine, pinning, atau pemindahan fokus.
- Ukuran route diukur ulang setelah font/gambar selesai, resize, dan toggle FAQ. Payment geometry dihitung saat mulai/replay, tanpa layout read di setiap frame.
- Diagram tetap ilustrasi marketing; tidak menjalankan atau mengonfirmasi transaksi.

Pola lifecycle mengikuti [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) dan [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

## Tes offline

```powershell
# Dari root repo; build selesai tanpa menyalakan server.
npm.cmd run build:static -w web
npm.cmd test -w web
npm.cmd run test:motion -w web
```

Harness browser memakai Playwright yang sudah tersedia di `web/.qa/node_modules/playwright`. Pada checkout baru, pasang alat QA terpisah:

```powershell
npm.cmd install --prefix web/.qa --no-save --package-lock=false playwright
```

Chrome lokal default: `C:/Program Files/Google/Chrome/Application/chrome.exe`. Atur `CHROME_PATH` jika lokasinya berbeda. `test:motion` membaca `web/out` dan memenuhi request browser langsung dari disk melalui intersepsi Playwright. Tidak membuka socket/server dan tidak mengakses deployment. Menjalankan HTML produksi, hydration, import engine, dan navigasi client yang asli.

Hasil: 33 unit test, lint, typecheck, build normal dan static export lolos. Browser lolos pada 1440/390px, dengan resize ke 768/320px: pembukaan hero, progres scroll, empat penerima, Replay Enter/Space, interupsi reduced motion, cleanup saat navigasi, dan pemasangan ulang saat kembali. Fallback tanpa JavaScript/reduced motion dan kunjungan non-Home sesudah landing tidak meminta chunk GSAP. Tidak ada page error, aset hilang, horizontal overflow, atau pin spacer pada skenario tersebut. Hero/footer tetap selebar viewport dan teks penutup tetap putih di atas overlay navy. Pemeriksaan geometri tambahan pada 1920/2560px juga lolos. Screenshot tersimpan di `web/.qa/gsap/`.

Tes menemukan prefetch segment Next yang menulis direktori bersarang di Windows, sementara router meminta nama bertitik. `scripts/static-export-paths.cjs` menambahkan nama payload yang sesuai setelah static build; byte payload asli dipertahankan. Regresi ini diuji unit dan navigasi browser tanpa rewrite khusus pada harness.

## Dampak bundle

Checkpoint revisi GSAP, sebelum halaman privat ditutup. Build normal pada mesin/toolchain yang sama, gzip setiap berkas secara terpisah:

| Ukuran | Sebelum GSAP | Sesudah |
|---|---:|---:|
| Seluruh JS yang dihasilkan | 192,590 byte | 240,404 byte |
| Jumlah berkas JS | 16 | 17 |
| Chunk Home motion yang ditunda | — | 48,846 byte gzip |
| Route produk diprerender | 8 | 8 |

Tambahan bersih **47,814 byte gzip (+24.8%)** untuk seluruh output JS. Angka ini mencakup penggantian controller lama dan perubahan batas client; berbeda dari ukuran chunk GSAP sendiri. Ini bukan ukuran transfer awal satu halaman. Engine diminta sesudah hydration ketika Home dan motion aktif; tetap menambah biaya download/parse pada kunjungan itu. Aset foto tetap 1,002,870 byte untuk seluruh varian, tanpa tambahan gambar atau font. Tidak ada benchmark perangkat nyata atau klaim peningkatan LCP/INP/FPS. Data: [performance-results.json](performance-results.json).

Revisi akses/preview berikutnya mempertahankan koreografi ini dan kembali lolos test:motion. Output JS terbaru 233,976 byte gzip; rincian perubahan akses dan font ada di [ACCESS-AND-PREVIEW.md](ACCESS-AND-PREVIEW.md), sedangkan checkpoint GSAP disimpan sebagai beforeAccessRevision di JSON.
