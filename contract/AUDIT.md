# Audit keamanan kontrak — FULLBACK dan fEUR

Tanggal: Sabtu 14 Nov 2026. Metode: skill `near-contract-audit` (15 detektor NEAR) + tinjauan manual logika bisnis.
Kode yang diaudit: `contract/src/lib.rs` (FULLBACK) dan `contract/ft/src/lib.rs` (fEUR) di commit `6f17b84`, versi yang sama dengan yang di-deploy ke `fullback.fullback-team.testnet` dan `feur.fullback-team.testnet`.

## Ringkasan

| ID | Tingkat | Temuan | Status |
|---|---|---|---|
| A-1 | Tinggi | `approve_deal` dan `record_resale` bisa dipanggil dengan kunci FunctionCall (tanpa `assert_one_yocto`) | Terbuka, butuh perubahan INTERFACE |
| A-2 | Sedang | `due_offset_sec` tanpa batas: satu deal jahat membuat `list_deals` dan `get_deal` panic (DoS view publik) | Terbuka, terbukti dengan tes |
| A-3 | Sedang | `list_deals_by_account` memindai semua deal | Diketahui, belum mendesak |
| A-4 | Rendah | `create_deal` / `record_resale` tidak meminta deposit storage | Diketahui, ditunda (keputusan grup) |
| A-5 | Rendah | Jalur gagal `on_payout` (ke `pending`) belum diuji di testnet | Terbuka |
| A-6 | Info | Akun kontrak masih punya kunci penuh, jadi pemegangnya bisa men-deploy ulang kode | Diterima untuk hackathon |

Tidak ada temuan yang membuat dana fEUR bisa dicuri atau hilang.

## Temuan

### A-1 (Tinggi, `yocto-attach`) — persetujuan deal dan penjualan ulang tanpa konfirmasi dompet

`approve_deal` (`lib.rs:384`) dan `record_resale` (`lib.rs:474`) tidak `#[payable]` dan tidak memanggil `assert_one_yocto()`. Fungsi tanpa deposit bisa ditandatangani oleh kunci FunctionCall, yang dibuat banyak dApp saat login dan dipakai tanpa konfirmasi pengguna. Web atau dApp jahat yang memegang kunci itu bisa:
- menyetujui deal atas nama klub penjual, atau
- mencatat penjualan ulang pemain milik klub ke akun penyerang dengan `fee` 1 unit. Setelah dibayar, penyerang menjadi pemilik pemain, dan sell-on serta Academy royalties dihitung dari 1 unit.

`release_collateral` dan `claim_pending` juga tanpa yocto, tapi uangnya selalu dikirim ke pemanggil sendiri, jadi risikonya kecil.

**Perbaikan:** tambah `#[payable]` + `near_sdk::assert_one_yocto()` di `approve_deal` dan `record_resale`, lalu klien melampirkan 1 yoctoNEAR (web lewat dompet; `scripts/lib/near.ts` `call()` dengan `deposit: 1n`). Ini mengubah INTERFACE, jadi perlu persetujuan grup.

### A-2 (Sedang, `unsafe-math` → DoS) — jadwal cicilan tanpa batas atas

`create_deal` hanya memeriksa bahwa `due_offset_sec` naik. Nilainya lalu dikalikan `NANOS_PER_SEC` di `Deal::due_at_ns` (`lib.rs:113`) tanpa `checked_mul`. Karena `overflow-checks = true`, perkalian yang meluap membuat panic. Itu benar untuk keamanan, tapi akibatnya fatal:
- `deal_view` memanggil `due_at_ns`, jadi `get_deal`, dan **`list_deals` untuk halaman yang memuat deal itu**, selalu gagal.
- Dashboard dan Federation view (yang membaca `list_deals`) rusak untuk semua orang.

Syaratnya: penyerang membuat deal dengan `due_offset_sec` sekitar `u64::MAX`, menyetujuinya dari akun kedua miliknya, lalu menyetor jaminan minimum (1 unit fEUR). Sudah dibuktikan dengan tes sementara: `list_deals` panic dengan "attempt to multiply with overflow".

**Perbaikan:** batasi `due_offset_sec` di `create_deal` (mis. maksimal 20 tahun = 631.152.000 detik) dan pakai `checked_mul`/`saturating_mul` di `due_at_ns`. Ini menambah satu aturan penolakan di INTERFACE; bentuk fungsi tidak berubah.

### A-3 (Sedang, `gas-griefing`) — `list_deals_by_account` memindai semua deal

`lib.rs:652`: filter dijalankan atas seluruh deal sebelum `skip`/`take`. Setelah ribuan deal, view ini melewati batas gas RPC. Dengan dana storage saat ini (sekitar 50 deal), batas itu belum tercapai. **Perbaikan nanti:** indeks `LookupMap<AccountId, Vec<u64>>` yang diisi di `create_deal`/`record_resale`.

### A-4 (Rendah, `cover-storage-cost`) — storage dibayar kontrak

Sudah dicatat di hasil code review (`docs/progress/orang-1.md`). Siapa pun bisa membuat deal gratis sampai saldo storage kontrak (sekitar 2,4 NEAR bebas) habis; setelah itu semua transaksi yang menulis state gagal. **Perbaikan:** `#[payable]` + ukur `env::storage_usage()` (setelah `flush()`) dan minta deposit. Mengubah INTERFACE.

### A-5 (Rendah, `prepaid-gas`) — jalur `pending` belum terbukti di chain

`on_payout` mendapat 6 TGas statis ditambah sisa gas. Pada jalur gagal, ia membaca dan menulis ulang daftar event deal. Di unit test jalur ini lulus, tapi di testnet hanya jalur sukses yang sudah dijalankan. **Saran:** satu uji di testnet: bayar cicilan ke akademi yang belum `storage_deposit`, lalu cek `get_pending` dan `claim_pending`.

### A-6 (Info) — kunci penuh akun kontrak

`fullback.fullback-team.testnet` dan `feur.fullback-team.testnet` masih memegang kunci penuh (di `scripts/.env.demo`). Pemegangnya bisa men-deploy ulang kode atau memindahkan NEAR akun kontrak. Wajar untuk hackathon dan memudahkan perbaikan; untuk produksi, hapus kunci penuh setelah deploy atau pindahkan ke DAO/multisig.

## Detektor yang lolos

| Detektor | Hasil |
|---|---|
| `non-private-callback` | `on_payout` dan `ft_resolve_transfer` bertanda `#[private]` |
| `reentrancy` | State diperbarui sebelum setiap `ft_transfer` (cicilan ditandai lunas, jaminan dinolkan, `pending` dihapus); gagal transfer dikembalikan ke `pending` di callback |
| `incorrect-argument-or-return-types` | Jumlah uang `U128`, waktu nanodetik `U64`. `u64` native hanya untuk `deal_id`, `due_offset_sec`, `block_height`, yang jauh di bawah 2^53 |
| `unsaved-changes` | Semua perubahan lewat `get_mut` atau `insert` pada koleksi `near_sdk::store`; dibuktikan di testnet (status deal bertahan lintas transaksi) |
| `owner-check` | `approve_deal` hanya penjual, `release_collateral` hanya pembeli, `record_resale` hanya pemilik pemain, `ft_on_transfer` hanya dari akun fEUR, tiap aksi bayar memeriksa pengirim, `mint` hanya pemilik token. `settle_due` sengaja bebas dipanggil |
| `storage-collision` | Prefix berbeda: `d`, `e`, `p`, `q` (FULLBACK), `t` (fEUR) |
| `required-initialization-macro` | `new` di kedua kontrak bertanda `#[init]` |
| `insecure-random` | Tidak memakai keacakan |
| `unsafe-math` (selain A-2) | `overflow-checks = true`; semua pengurangan didahului `require!` atau invariant (jaminan ≤ wajib, sell-on + pembinaan ≤ 100 %) |
| `float-math` | Tidak ada float; bps dengan pembulatan ke bawah, sisa ke penjual |

## Catatan logika bisnis (bukan kerentanan)

- Deal `Defaulted` menahan sisa jaminan tanpa jalan keluar (tidak ada alur sengketa, sesuai PLAN).
- Deal `Proposed` dan penjualan ulang yang belum dibayar tidak bisa dibatalkan, sehingga `player_id` bisa terkunci (ditunda, keputusan grup).
- Sell-on hanya berlaku untuk penjualan ulang pertama: deal ulang menyimpan `sell_on_bps = 0`, sesuai klausul sell-on yang lazim.
