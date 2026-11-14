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

**Sabtu 14 Nov**
- Akun master `fullback-team.testnet` dibuat lewat faucet (10 NEAR). Dana per akun di `setup-demo.ts` disesuaikan agar muat 10 NEAR (kontrak 5 NEAR ≈ 50 deal demo; top up kalau menipis).
- `npm run setup:demo` sukses: kontrak `fullback.fullback-team.testnet`, token `feur.fullback-team.testnet`, Penagih `keeper.fullback-team.testnet` dengan kunci terbatas `settle_due`. Alamat sudah di `INTERFACE.md`.
- `npm run demo` sukses **dua kali berturut-turut**: cicilan, jaminan dipakai oleh Penagih, agen curang ditolak (`AccessKeyReceiverMismatchActionError`), top up, lunas, resale Deal 2. Saldo akhir sama persis dengan R3 + R4, kontrak tersisa 0 fEUR.
- Perbaikan `run-demo.ts`: percobaan agen curang dikirim tanpa deposit (deposit membuat chain menolak dengan alasan lain) dan dikenali dari jenis error `AccessKey...`. Transaksi ini ditolak sebelum masuk blok, jadi tidak punya link explorer.
- Deal 0 di testnet tersisa sebagai deal `Active` dengan jaminan 0 dari putaran pertama yang berhenti di langkah agen curang; tidak memengaruhi demo berikutnya.

- Wallet NEAR testnet di web (branch `orang-1/web-wallet`, dengan izin Orang 3): `@hot-labs/near-connect` 0.12.0, tombol Connect di `/signin` dan nav menampilkan akun yang tersambung serta saldo fEUR. Konektor hanya dimuat saat dipakai, tanpa kunci terbatas (setiap transaksi dikonfirmasi di wallet). Workspace tetap tertutup sampai membaca data kontrak. `useWallet().callFunction` siap dipakai Orang 3. Lint, typecheck, 42 unit test, `test:access`, `test:entry` lulus.

**Sabtu 14 Nov (malam), issue #3 selesai**
- `cargo test` 34/34 lulus. Audit `near-contract-audit` disimpan di `contract/AUDIT.md`.
- `<master>` terakhir di contoh `create_deal` di `INTERFACE.md` diganti `fullback-team.testnet`.
- `npm run demo` sukses lagi (putaran ke-3, pemain `lucas-1794674036388`, Deal 7 + resale Deal 8). Semua saldo cocok dengan R3 + R4, kontrak tersisa 0 fEUR. Link explorer:
  1. Mint 12.500.000 fEUR ke Porto Alegre FC: https://testnet.nearblocks.io/txns/35mJvfWJdEg1oXKcQnke8Aw3kpJA2dcv592Jsjkh6tjq
  2. `create_deal` Deal 7: https://testnet.nearblocks.io/txns/2Wz8ns64teRkdYnHKpTtTaNkvn9CyjQ3w5XsuEEyXMXe
  3. `approve_deal` oleh Nordvik IF: https://testnet.nearblocks.io/txns/BCeF1VfqSgckLhGXm9GPum4LcPrTRPGbjkT7SAnDuDvf
  4. Setor jaminan 2.500.000 fEUR, deal Active: https://testnet.nearblocks.io/txns/FbXgzYNU6wAXLbPKS4aQ5TL9C4EesLYUgjL6giCi12JU
  5. Bayar cicilan 1: https://testnet.nearblocks.io/txns/2FKr74boXddtnNTCYLMk5eZ4jjnum5oDZz9cgVhava2b
  6. Penagih `settle_due`: cicilan 2 dibayar dari jaminan: https://testnet.nearblocks.io/txns/EYGSqf4XyH1bcKBuFgnDFP8EKVvGhzS12v6a8L73vWsr
  7. Top up jaminan: https://testnet.nearblocks.io/txns/CUVfUFptAAP9wVwfbGXnUwDPSnr8txqxeXpcS6zSY1Uq
  8. Bayar cicilan 3: https://testnet.nearblocks.io/txns/Bp2GQZJa1k496LaRYZzE23esRGDARFje8PeGj3DPUwGE
  9. Bayar cicilan 4, deal Completed: https://testnet.nearblocks.io/txns/5WUqX3xxAC9dv9XdW7rMmtu41SC641AVJocxCBLzA1Pw
  10. `release_collateral`: https://testnet.nearblocks.io/txns/CFHgRacQ6US71D26dBNzSmMvZzYPPKkb3Vqe4BNBYNpr
  11. `record_resale` ke Club Z (Deal 8): https://testnet.nearblocks.io/txns/5KEar47NakmDYjoGKrxJYh5tWDc8Gfk7vh8zoTML7Vi4
  12. Mint 20.000.000 fEUR ke Club Z: https://testnet.nearblocks.io/txns/6pzdDkkmvt1sbxJhVSVLNAPoCcj8p5AKbMALuFBAUTAS
  13. `pay_resale` 20.000.000 fEUR, dibagi dalam satu transaksi: https://testnet.nearblocks.io/txns/HNiELFYUoyzWBWCvZacVfSSEwh6vtPQ2zt8UoXfPyNcW
  - Agen curang (`ft_transfer` ke fEUR dengan kunci Penagih) ditolak chain: `AccessKeyReceiverMismatchActionError`. Ditolak sebelum masuk blok, jadi tanpa link.

## Belum

- Perbaikan temuan audit A-1 (`assert_one_yocto` di `approve_deal`/`record_resale`) dan A-2 (batas `due_offset_sec`): butuh persetujuan grup karena menyentuh INTERFACE. Lihat `contract/AUDIT.md`.

## Butuh dari orang lain

- **Semua:** setujui `contract/INTERFACE.md` supaya bisa dibekukan.
- **Orang 4:** tambah variabel baru ke `.env.example`: `MASTER_PRIVATE_KEY`, `CONTRACT_PRIVATE_KEY`, `DEMO_ACADEMY_1_ACCOUNT_ID`, `DEMO_ACADEMY_1_PRIVATE_KEY`, `DEMO_ACADEMY_2_ACCOUNT_ID`, `DEMO_ACADEMY_2_PRIVATE_KEY`, `KEEPER_FULL_ACCESS_PRIVATE_KEY`.
- **Orang 2 dan 3:** isi `scripts/.env.demo` (akun + kunci demo) dibagikan langsung oleh Orang 1, bukan lewat git atau chat grup. Untuk Vercel, isi environment-nya dari file itu.
- **Orang 2:** `agent/collector/illegal-attempt.ts` mengirim `deposit: 1n`; chain menolaknya dengan `AccessKeyDepositWithFunctionCallActionError`. Tanpa deposit, alasannya `AccessKeyReceiverMismatchActionError` (kunci hanya untuk kontrak FULLBACK), yang lebih jelas untuk juri.
- **Orang 2:** Penagih memakai `settle_due` yang tidak pernah panic dan mengembalikan `{ result, installment_index }`; lihat INTERFACE. **Penting:** setiap `settle_due` memotong allowance kunci terbatas (±0,015 NEAR di 150 TGas) walau hasilnya `NotDue`. Jadi `tick()` harus membaca `get_deal`/`list_deals` (gratis) dan hanya mengirim `settle_due` kalau `status == "Active"` dan `next_due_at_ns` sudah lewat. Kalau tidak, allowance 2 NEAR habis dalam ±30 menit polling 15 detik.

## Hasil code review (Kamis 12 Nov)

Diperbaiki: `get_deal`/`verify_pdf_hash` tidak lagi membungkus id > u32; batas klub pembina 10 → 5 agar pembagian muat di gas; gas skrip 150/250 TGas; dana kontrak 3,5 → 7 NEAR; allowance Penagih 2 NEAR; `setup-demo` tidak menimpa kunci tersimpan saat RPC error dan mengecek kunci Penagih di chain; langkah "agen curang" hanya lulus kalau ditolak karena kunci.

Ditunda (butuh keputusan grup karena mengubah INTERFACE):
- `create_deal` belum meminta deposit storage; siapa pun bisa membuat deal gratis dan menghabiskan saldo storage kontrak. Solusi: `#[payable]` + hitung `storage_usage`.
- Penjualan ulang yang belum dibayar dan deal `Proposed` tidak bisa dibatalkan (pemain terkunci). Solusi: `cancel_resale` / `cancel_deal` + status `Cancelled`.
