# Progres Orang 1 — Kontrak

## Selesai

**Kamis 12 Nov**
- `contract/INTERFACE.md` draft v1: semua fungsi, `msg` untuk `ft_transfer_call`, bentuk `Deal`/`Event`, view. Dua pertanyaan terbuka PLAN dijawab sesuai usulan (cicilan boleh dibayar lebih awal; top up harus penuh).
- Kontrak FULLBACK (`contract/src/lib.rs`) dan token fEUR (`contract/ft/`), build wasm ada di `contract/res/`.
- 33 tes lulus (`cd contract && cargo test`): pembagian cicilan, jaminan dipakai, Defaulted, `settle_due` sebelum jatuh tempo dan dua kali, token palsu ditolak, validasi `create_deal`, kelebihan bayar, saldo akhir sama dengan perjanjian, `mint` hanya pemilik, payout gagal → `pending` → `claim_pending`, penjualan ulang Deal 2, sidik jari PDF.
- `scripts/`: `setup-demo.ts` (akun + deploy + storage + kunci terbatas Penagih), `run-demo.ts` (cerita penuh + link explorer + cek saldo), `deploy.sh`, `add-keeper-key.sh`.

Catatan teknis:
- Tes memakai simulasi ledger fEUR di unit test near-sdk, bukan near-workspaces, karena sandbox NEAR tidak jalan di Windows. Uji integrasi sesungguhnya = `npm run demo` di testnet.
- `contract/.cargo/config.toml` memakai NASM bawaan, jadi `cargo test` di Windows tidak perlu memasang NASM.
- Build: `contract/build.sh` (butuh cargo-near; ABI dimatikan karena gagal di Windows).

## Belum

- Deploy testnet dan `npm run demo` dua kali berturut-turut (butuh akun master).
- Audit `near-contract-audit` sebelum deploy final.
- Isi alamat testnet di `INTERFACE.md`.

## Macet

- Butuh akun master testnet (≈12 NEAR) + kuncinya di `.env` sebagai `MASTER_ACCOUNT_ID` dan `MASTER_PRIVATE_KEY`.

## Butuh dari orang lain

- **Semua:** setujui `contract/INTERFACE.md` supaya bisa dibekukan.
- **Orang 4:** tambah variabel baru ke `.env.example`: `MASTER_PRIVATE_KEY`, `CONTRACT_PRIVATE_KEY`, `DEMO_ACADEMY_1_ACCOUNT_ID`, `DEMO_ACADEMY_1_PRIVATE_KEY`, `DEMO_ACADEMY_2_ACCOUNT_ID`, `DEMO_ACADEMY_2_PRIVATE_KEY`, `KEEPER_FULL_ACCESS_PRIVATE_KEY`.
- **Orang 4:** `package-lock.json` root berubah karena dependensi `scripts/` (near-api-js, tsx, dotenv).
- **Orang 2:** Penagih memakai `settle_due` yang tidak pernah panic dan mengembalikan `{ result, installment_index }`; lihat INTERFACE. **Penting:** setiap `settle_due` memotong allowance kunci terbatas (±0,015 NEAR di 150 TGas) walau hasilnya `NotDue`. Jadi `tick()` harus membaca `get_deal`/`list_deals` (gratis) dan hanya mengirim `settle_due` kalau `status == "Active"` dan `next_due_at_ns` sudah lewat. Kalau tidak, allowance 2 NEAR habis dalam ±30 menit polling 15 detik.

## Hasil code review (Kamis 12 Nov)

Diperbaiki: `get_deal`/`verify_pdf_hash` tidak lagi membungkus id > u32; batas klub pembina 10 → 5 agar pembagian muat di gas; gas skrip 150/250 TGas; dana kontrak 3,5 → 7 NEAR; allowance Penagih 2 NEAR; `setup-demo` tidak menimpa kunci tersimpan saat RPC error dan mengecek kunci Penagih di chain; langkah "agen curang" hanya lulus kalau ditolak karena kunci.

Ditunda (butuh keputusan grup karena mengubah INTERFACE):
- `create_deal` belum meminta deposit storage; siapa pun bisa membuat deal gratis dan menghabiskan saldo storage kontrak. Solusi: `#[payable]` + hitung `storage_usage`.
- Penjualan ulang yang belum dibayar dan deal `Proposed` tidak bisa dibatalkan (pemain terkunci). Solusi: `cancel_resale` / `cancel_deal` + status `Cancelled`.
