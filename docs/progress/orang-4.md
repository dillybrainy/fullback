# Progress Orang 4 (desain, konten, koordinator)

## Rabu 11 Nov
- U1 kerangka repo selesai dan di-push; PLAN.md rev 2 dan CLAUDE.md diunggah.
- Arah desain dipilih setelah beberapa putaran: bersih dan "mahal", dengan unsur sepak bola sebagai aksen (kartu kuning, jersey, lapangan).
- Figma Fase 1 (web umum, bahasa Inggris, tanpa unsur demo): Home, Sign in, Dashboard, Deal, New deal, Verify, Resale, Federation view.
- Keputusan: produk umum dulu, demo Lucas belakangan; federasi hanya memantau; login lewat dompet NEAR + pilih peran; istilah "Academy royalties".

## Kamis 12 Nov
- Riset sumber: `docs/bukti-masalah.md` (semua angka pitch bersumber, plus koreksi PLAN: bunga 5% bukan 8%, Clearing House ±$1 miliar dialokasikan / $639 juta dibayarkan) dan `docs/pembeda.md`.
- PDF contoh: `sample-agreements/deal1-nordvik-portoalegre.pdf`, `deal1-TAMPERED.pdf`, `deal2-portoalegre-clubz.pdf`, lengkap dengan sumber teks, hash, dan catatan untuk Orang 2.
- Figma Fase 2: Judge Demo Start, Deal demo Lucas (bilah demo + agen curang), Resale demo Lucas.
- 3 opsi logo (page "Logo Options" di Figma + `docs/brand/*.svg`).
- Draft README, `docs/libraries.md`, `docs/design-handoff.md`, `docs/video-script.md`, `docs/video-prompts.md`, `docs/submit-checklist.md`.
- Figma dilengkapi:
  - Fase 1: 8 status deal plus tombol per peran, modal transaksi dan toast, Dashboard tab Buying dan Academy, Dashboard kosong, Sign in sebelum wallet tersambung, banner error, halaman 404, dan skeleton loading.
  - Mobile 390: Home dan Deal.
  - Fase 2: bilah juri untuk langkah 1–8, state selesai, dan error.
  - Semua node tercatat di `docs/design-handoff.md`. **Desain selesai, diserahkan ke Orang 3.**

- Figma dirapikan dan dilengkapi:
  - Satu page "Web app — all screens" dengan section 00–10, diurutkan sesuai alur. Tiap layar diberi keterangan route dan siapa yang melihat.
  - Layar baru:
    - New deal: Upload, reading the PDF, dan Ready to create.
    - Deal untuk buyer dan untuk federation, plus 8 status deal sebagai layar penuh.
    - Sign in untuk peran Academy dan Federation.
    - Overlay: pilih wallet, menu akun, filter status, menu mobile, dan modal transaksi.
  - Perbaikan: di halaman Deal milik penjual, tombol "Top up" dan "Record a resale" dihapus karena itu aksi pembeli.
  - Semua tombol tersambung di Prototype (8 flow) dan diberi annotation route serta fungsi kontraknya.
  - 3 flowchart dibuat di FigJam: screen flow, deal lifecycle, dan aliran uang.

## Kamis 12 Nov — keputusan
- **Logo final: opsi C "Goal Frame"** (dipilih Dilly). Sudah terpasang di semua layar Figma, page logo ditandai "Chosen".

## Yang masih menunggu orang lain
- Orang 1: putuskan pertanyaan terbuka PLAN no. 1–2 (bayar lebih awal, top up penuh) dan isi `CONTRACT_ID`.
- Orang 2: fixture `deal1.json` menyesuaikan nama "Lucas Andrade" dan lahir 14 March 2001 dari PDF; isi versi library.
- Orang 3: ekspor foto dari Figma ke `web/public/images/`; isi versi library.

## Sabtu 14 Nov (rencana)
- Rekam dan rakit video, isi placeholder README, ubah repo jadi publik, posting X, isi form (lihat `docs/submit-checklist.md`).
