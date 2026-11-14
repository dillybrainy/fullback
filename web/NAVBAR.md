# Navbar dan landing FULLBACK

Implementasi atas permintaan pengguna memakai skill shadcn, Emil Design Engineering, dan Impeccable. Pengguna mengizinkan komposisi yang berbeda dari Figma. Scope ini memperkuat navbar dan pembukaan Home, dengan CTA yang konsisten di halaman publik; bukan integrasi login atau pembukaan workspace.

## Direction contract

**Thesis:** matchday control deck. Navigasi terasa seperti pusat kendali pertandingan, dengan aksi utama yang tegas dan urutan transfer yang langsung terlihat.

**Own-world:** navy solid, kuning, logo goal-frame, font lokal Schibsted Grotesk, dan foto stadion. Kontrol aktif terang, CTA kuning, permukaan isi tetap tenang.

**Story:** pengguna memahami perlindungan cicilan, melihat empat langkah, lalu memilih membuat deal atau mempelajari proses. Status testnet dan keterbatasan login tetap jujur.

**First viewport:** navbar inset tetap terlihat di atas, headline putih berukuran besar di kiri, stadion malam memenuhi layar, CTA di bawah penjelasan, playbook empat langkah menutup hero. Mobile memakai menu terarah dan tombol minimal 44px.

**Form:** code-led amplification pada dunia visual yang sudah ada; tanpa comp atau penggantian brand. `seed: none (unavailable)`. Launcher Impeccable gagal karena engine/cache tidak tersedia; konteks dibaca langsung dari proyek.

**Finish:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Komponen yang dipakai

Source dari registry resmi `@shadcn`, style `base-nova`: [Button](https://ui.shadcn.com/docs/components/base/button), [Navigation Menu](https://ui.shadcn.com/docs/components/base/navigation-menu), dan [Popover](https://ui.shadcn.com/docs/components/base/popover). Ketiganya ditambahkan lewat CLI, dibaca ulang, lalu disesuaikan. Navigation Menu hanya mempertahankan bagian link yang dipakai; tidak memuat viewport popup desktop yang tidak diperlukan.

- `components/ui/button.tsx`: varian default/navy, accent/kuning, inverse, dan navigation. Target utama 44px, CTA hero 52px. Navigasi tetap memakai anchor dengan role link; custom render Base UI memakai nativeButton=false.
- `components/ui/navigation-menu.tsx`: daftar link dengan status aktif dari hash URL, termasuk back/forward. Anchor dalam Home memakai navigasi hash native.
- `components/ui/popover.tsx`: posisi/fokus/Escape/outside click dari Base UI; transform-origin mengikuti trigger. Menu non-modal, tidak mengunci scroll halaman.
- `components/site-nav.tsx`: navbar tetap terlihat, berpindah ke menu pada lebar 1100px; menu ditutup ketika pindah ke desktop. Semua subscription dibersihkan.

Tailwind hanya memuat theme/utilities, tanpa Preflight. CSS lama berada dalam layer legacy agar utilitas komponen baru bekerja tanpa reset global yang merusak halaman existing. Token shadcn dipetakan ke warna FULLBACK. Font Geist/tema default yang ditambahkan initializer tidak dipakai. CLI dan CSS animasi tambahan yang tidak diperlukan sudah dilepas dari dependency proyek; perintah pemeliharaan tetap memakai `npx shadcn@latest`.

## Interaksi

| Before | After | Why |
|---|---|---|
| Link polos dengan bobot sama | Segmen aktif dengan penanda kuning | Menunjukkan lokasi dan membedakan aksi |
| Menu mobile custom | Popover berjangkar dengan pengelolaan fokus library | Escape, klik luar, resize, dan keyboard lebih dapat diandalkan |
| Respons tombol umum | Transisi properti spesifik 150ms, tekanan .97 | Feedback singkat tanpa menggeser area navigasi |
| Animasi masuk tetap saat Enter | Menu keyboard instan; pointer 180–200ms | Tidak menunda navigasi keyboard |
| Hero foto pagi berkabut | Stadion malam dengan headline putih dan playbook | Identitas sepak bola lebih langsung terlihat |

Reduced motion tetap didukung. GSAP hero/process/payment yang sudah ada dipertahankan. Tidak ditambahkan loop atau engine motion lain. Copy, nilai pembayaran, aturan akses dan first entry tidak diubah.

Tautan How it works, For clubs, dan FAQ menargetkan judul h2 langsung, dengan jarak 16px di bawah navbar. Scroll padding mengikuti ukuran navbar desktop/tablet/mobile (112/108/92px). Target judul dapat menerima fokus keyboard tanpa menambah urutan Tab. Refresh ScrollTrigger akibat foto/font menunggu scroll tenang selama 250ms agar tidak memotong smooth scroll native; timer dan listener dibersihkan saat pindah halaman. Tes navbar memeriksa ketiga tujuan, arah scroll naik/turun, reduced motion, dan navigasi dari Verify pada tujuh lebar layar.

## Gambar dan provenance

Hero memakai ulang `imgPhotoStadiumStandsAtNightUnderFloodlights` dari aset Figma yang sudah tersedia. Tidak ada raster baru atau aset eksternal. WebP mobile 480px sebesar 22,410 byte; seluruh varian gambar tetap 1,002,870 byte. Aset asli dan sumber Figma tercatat di DESIGN.md.

## Verifikasi

Jalankan dari root repo, tanpa server:

```powershell
npm.cmd run build:static -w web
npm.cmd run test:navbar -w web
npm.cmd run test:entry -w web
npm.cmd run test:motion -w web
npm.cmd run test:access -w web
npm.cmd test -w web
npm.cmd run lint -w web
npm.cmd run typecheck -w web
```

Prasyarat Playwright/Chrome sama dengan [MOTION.md](MOTION.md). Jangan membangun ulang output `out` saat tes browser masih membaca berkasnya; selesaikan build dahulu, lalu jalankan tes. Screenshot review di `.impeccable/review/`, tidak disajikan ke pengunjung.

Hasil: 42 unit test, lint tanpa warning, TypeScript, build normal, dan static export lolos. Tes navbar lolos pada 320/390/768/1100/1101/1440/1920px; matriks halaman publik Chrome DPR 1x/2x serta Edge lolos pada sebelas lebar 320–2560px. Tes entry dan motion juga lolos. Tidak ada server lokal yang dinyalakan. Review visual independen memberi disposition **ship** untuk navbar, hero, menu mobile, dan konsistensi Verify; tidak ada comp/QUALITY BAR/detector yang dievaluasi karena konteks launcher tidak tersedia.

## Dampak ukuran

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| Seluruh output JS, gzip per file | 234,409 byte | 289,995 byte |
| Jumlah chunk JS | 15 | 16 |
| Route produk diprerender | 8 | 8 |
| Aset raster baru | — | 0 byte |

Tambahan bersih **55,586 byte gzip (+23.7%)** untuk primitives Base UI, ikon, dan integrasi navbar. Ini jumlah seluruh chunk yang dihasilkan, bukan transfer awal satu halaman. Tidak ada klaim FPS/LCP/INP atau throughput tanpa pengukuran perangkat/deployment. CLI shadcn tidak menjadi dependency proyek; Tailwind hanya alat build. Pengukuran lengkap: [performance-results.json](performance-results.json).
