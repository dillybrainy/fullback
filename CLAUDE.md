# CLAUDE.md — aturan untuk setiap sesi Claude Code di repo FULLBACK

Kamu membantu tim 4 orang yang baru pertama kali ikut hackathon dan belum terbiasa membuat website.
Jelaskan dengan bahasa Indonesia yang sederhana. Kalau memakai istilah teknis, beri arti singkatnya.

## 1. Sebelum menulis kode apa pun

1. Baca `PLAN.md` sampai selesai. Itu satu-satunya sumber kebenaran.
2. Tanyakan "Kamu Orang berapa?" kalau pengguna belum menyebutkannya. Jangan menebak.
3. Baca `docs/progress/orang-N.md` milik orang itu untuk tahu sampai mana pekerjaannya.
4. Jalankan `git pull --rebase`. Kalau ada konflik, berhenti dan suruh pengguna mengabari grup.
5. Sebutkan unit (U1–U8) yang akan dikerjakan dan apa hasilnya, lalu mulai.

## 2. Folder milik masing-masing orang

| Orang | Boleh mengubah | Skill yang dipakai |
|---|---|---|
| Orang 1 — kontrak | `contract/`, `scripts/`, `docs/progress/orang-1.md` | near-smart-contracts, near-contract-audit, near-cli-rs |
| Orang 2 — agen AI | `agent/`, `docs/progress/orang-2.md` | near-ai-cloud, near-api-js atau near-kit |
| Orang 3 — frontend | `web/`, `docs/progress/orang-3.md` | near-dapp, frontend-design, figma:figma-design-to-code, ce-test-browser |
| Orang 4 — desain, konten, koordinator | `docs/`, `sample-agreements/`, `README.md`, `PLAN.md`, `CLAUDE.md`, file di root | ce-noslop, figma |

Jangan mengubah file di luar folder orang yang sedang kamu bantu.
Kalau perlu perubahan di folder lain, tulis permintaannya dalam satu paragraf yang bisa disalin pengguna ke grup, lalu lanjutkan pekerjaan lain.

## 3. Hal yang terkunci (jangan diubah tanpa izin manusia)

- Angka cerita Lucas di `PLAN.md` R1–R4: 10.000.000, 4 × 2.500.000, jaminan 2.500.000, sell-on 15% kotor, pembinaan 1% + 4%, Deal 2 20.000.000 dengan pembagian 3.000.000 / 800.000 / 200.000 / 16.000.000.
- `contract/INTERFACE.md` (pemilik Orang 1) dan `agent/schema.ts` (pemilik Orang 2) setelah Rabu 11 Nov malam.
- Daftar fitur di luar lingkup di `PLAN.md`. Jangan menambah fitur yang tidak ada di PLAN.md, sekecil apa pun.
- Stretch (Rapor Klub, JURAGAN, Intents) hanya dikerjakan jika pengguna bilang semua yang wajib sudah selesai.

## 4. Hal yang tidak boleh kamu lakukan sama sekali

- Memakai mainnet, uang asli, atau NEAR Intents mainnet. Itu hanya untuk manusia.
- Menulis kunci privat, seed phrase, atau API key ke file selain `.env`. Jangan pernah commit `.env`.
- Menjalankan `git push --force`, `git reset --hard`, atau menghapus riwayat git.
- Membuat repo publik, posting di X, atau mengisi form hackathon.
- Membuat branch baru. Tim bekerja langsung di `main` (PLAN.md KTD10).
- Menyelesaikan konflik git sendiri.

## 5. Cara kerja

- Kerjakan satu unit sampai tesnya hijau sebelum pindah ke unit berikutnya.
- Untuk kontrak dan agen, tulis tes skenario dari PLAN.md lebih dulu, lalu kodenya.
- Setelah satu bagian jalan, commit kecil dengan pesan yang jelas, lalu push. Jangan menumpuk pekerjaan seharian dalam satu commit.
- Setiap transaksi yang ditampilkan ke pengguna harus menyertakan link `https://testnet.nearblocks.io/txns/<hash>`.
- Kalau kamu tidak yakin soal keputusan yang memengaruhi orang lain, berhenti dan tanya pengguna. Jangan menebak.
- Kalau tes gagal karena kode di folder orang lain, jangan memperbaikinya. Jelaskan masalahnya supaya pengguna bisa meneruskannya ke pemilik folder.

## 6. Sebelum sesi berakhir

1. Perbarui `docs/progress/orang-N.md`: apa yang selesai, apa yang macet, apa yang dibutuhkan dari orang lain.
2. Commit dan push.
3. Beri tahu pengguna dalam 3 kalimat: apa yang selesai, apa langkah berikutnya, dan apakah ada yang harus dikabarkan ke grup.

## 7. Perintah penting

- Tes kontrak: `cd contract && cargo test`
- Tes agen: `npm test -w agent`
- Build web: `npm run build -w web`
- Jalankan web lokal: `npm run dev`
- Putar cerita penuh di testnet: `npm run demo`
- Jalankan Penagih: `npm run collector`

Deadline submit: Sabtu 14 Nov 2026 23:59 UTC = Minggu 15 Nov 06:59 WIB. Target tim: Sabtu malam WIB.
