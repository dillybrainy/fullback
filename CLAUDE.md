# CLAUDE.md — FULLBACK (NEAR HACKATHON "Build Beyond Boundaries")

File ini dibaca otomatis oleh Claude Code di setiap sesi. Sumber kebenaran tetap `PLAN.md`; kalau ada yang bertentangan, `PLAN.md` yang menang, lalu tanyakan ke manusia.

## Sebelum menulis kode

1. Baca `PLAN.md` sampai selesai.
2. Tanyakan "Kamu Orang berapa?" kalau pengguna belum menyebutnya, lalu kerjakan hanya unit milik orang itu.
3. Jalankan `git pull --rebase` sebelum mulai.

## Apa yang sedang dibangun

- FULLBACK adalah aplikasi umum untuk klub sepak bola: perjanjian transfer menjadi kontrak di NEAR testnet yang memegang jaminan, menagih cicilan, membayar sell-on, dan menyalurkan Academy royalties ke SSB/akademi pembina. FIFA atau federasi hanya memantau lewat Federation view.
- **Fase 1 (sekarang):** web umum tanpa unsur demo. Jangan menulis "Lucas", "Judge", atau "demo" di halaman Fase 1. Pakai data contoh netral dari `PLAN.md` (Riverside SC → Kingsport FC).
- **Fase 2 (setelah Fase 1 tersambung ke testnet):** Judge demo mode dengan skenario Lucas (R1–R4), bilah demo, dan tombol "Coba agen curang", ditambahkan di atas halaman Fase 1 yang sama.
- Semua teks di web berbahasa Inggris. Royalti SSB ditulis "Academy royalties".

## Siapa memegang folder apa

| Orang | Folder |
|---|---|
| Orang 1 (kontrak) | `contract/`, `scripts/` |
| Orang 2 (agen AI) | `agent/` |
| Orang 3 (frontend) | `web/` |
| Orang 4 (desain, konten, koordinator) | `docs/`, `sample-agreements/`, `README.md`, `PLAN.md`, `CLAUDE.md`, file root |

Catatan harian ditulis di `docs/progress/orang-N.md` milik masing-masing.

## Aturan keras

- Hanya ubah file di folder milik orang yang sedang bekerja.
- Jangan ubah angka R1–R4 (data demo Lucas). Jangan mengarang angka lain untuk kontrak atau tes.
- `contract/INTERFACE.md` dan `agent/schema.ts` dibekukan sejak Rabu 11 Nov malam. Perubahan harus disetujui keempat orang.
- Persentase Academy royalties dihitung oleh kode (`agent/training.ts`), bukan oleh LLM.
- Testnet saja. Jangan pernah memakai mainnet atau uang asli.
- Jangan commit `.env`, kunci privat, atau seed phrase. Kunci akun demo hanya ada di environment Vercel.
- Desain Figma memakai layer biasa, tanpa component atau instance.
- Semua commit langsung ke `main` (tanpa branch). Commit kecil dan sering, lalu push.

## Berhenti dan tanya manusia jika

1. Perlu mengubah file di luar folder sendiri.
2. Perlu mengubah `INTERFACE.md`, `schema.ts`, atau angka terkunci.
3. Diminta memakai mainnet atau uang asli.
4. `git pull` menghasilkan konflik. Jangan menyelesaikan konflik sendiri; kabari grup.
5. Tes kontrak gagal dan penyebabnya ada di folder orang lain.

## Hanya manusia yang boleh

Mengeluarkan uang asli, deploy ke mainnet, membuat repo publik, posting di X, dan mengisi form submit (sekali, tidak bisa diedit).

## Perintah penting

| Tujuan | Perintah |
|---|---|
| Tes kontrak | `cd contract && cargo test` |
| Tes agen | `npm test -w agent` |
| Build web | `npm run build -w web` |
| Jalankan web | `cp .env.example .env && npm install && npm run dev` |
| Cerita penuh di testnet (Fase 2) | `npm run demo` |

## Desain

Figma: https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy (halaman "Web — Desktop 1440"). Font Instrument Sans, latar #F2F2F2, kartu putih radius 24, satu aksen kuning #FFD60A untuk status "harus top up". Nama layer di Figma mengikuti nama bagian di kode (mis. `Hero/Headline`, `Button/Primary`).
