# INTERFACE — Kontrak FULLBACK dan token fEUR

Pemilik: Orang 1. Dokumen ini adalah bentuk final fungsi kontrak yang dipakai `agent/` (Orang 2) dan `web/` (Orang 3).
Setelah dibekukan, perubahan harus diumumkan di grup dan disetujui keempat orang.

Status: **draft v1, menunggu persetujuan grup** (ditulis Kamis 12 Nov; seharusnya beku Rabu malam).

## Alamat testnet

| Kontrak | Akun | Catatan |
|---|---|---|
| FULLBACK | `fullback.fullback-team.testnet` | deploy 14 Nov, https://testnet.nearblocks.io/address/fullback.fullback-team.testnet |
| fEUR (NEP-141) | `feur.fullback-team.testnet` | pemilik (bisa `mint`) = akun itu sendiri |
| Penagih | `keeper.fullback-team.testnet` | kunci terbatas: hanya `settle_due` di FULLBACK |
| Akun demo | `nordvik.`, `portoalegre.`, `clubz.`, `kotafc.`, `akademidesa.` + `fullback-team.testnet` | kunci di `scripts/.env.demo` (tidak di git) |

Explorer: `https://testnet.nearblocks.io/txns/<tx_hash>` dan `https://testnet.nearblocks.io/address/<account_id>`.

## Aturan umum

- **Satuan uang:** fEUR punya **6 desimal**. Semua jumlah di kontrak adalah string `U128` dalam satuan terkecil. `2.500.000 fEUR` = `"2500000000000"`.
- **Waktu:** `*_ns` = nanodetik sejak epoch (dari `block_timestamp`). Jadwal cicilan disimpan sebagai `due_offset_sec` (detik setelah deal aktif). Tanggal asli dari PDF hanya ditampilkan di web, tidak disimpan on-chain.
- **bps:** 1 bps = 0,01 %. 10000 bps = 100 %. Semua hitungan memakai pembulatan ke bawah; sisa pembulatan masuk ke penjual.
- **Hash PDF:** SHA-256 dalam hex, 64 karakter. Kontrak menyimpannya dalam huruf kecil.
- **Gas:** `settle_due` disarankan 150 TGas, `release_collateral` dan `claim_pending` 100 TGas; fungsi ubah lain 30 TGas.
- **Pembayaran** selalu lewat `ft_transfer_call` di kontrak fEUR dengan `receiver_id = <FULLBACK>` dan `msg` JSON (lihat bawah). Kontrak FULLBACK menolak token dari akun selain fEUR resmi; token itu dikembalikan otomatis oleh standar NEP-141.
- **Kelebihan bayar** dikembalikan ke pengirim (lewat nilai balik `ft_on_transfer`).
- **Kekurangan bayar** ditolak seluruhnya (uang dikembalikan).

## Status deal

```
Proposed  → Approved   (approve_deal oleh penjual)
Approved  → Active     (deposit_collateral penuh oleh pembeli)
Active    → Active     (pay_installment, settle_due memakai jaminan, top_up_collateral)
Active    → Defaulted  (cicilan telat dan jaminan kurang dari cicilan itu)
Active    → Completed  (cicilan terakhir lunas)
Completed → Resold     (deal penjualan ulang dibayar penuh)
```

Nilai JSON: `"Proposed" | "Approved" | "Active" | "Defaulted" | "Completed" | "Resold"`.

"Harus top up" bukan status tersendiri: lihat field `needs_top_up` (true kalau `status == "Active"` dan `collateral_balance < collateral_required`).

Deal penjualan ulang (`kind = "Resale"`) dibuat oleh `record_resale` dengan status `Approved`, lalu langsung `Completed` saat dibayar lewat `pay_resale`. Deal asal berubah menjadi `Resold` pada saat yang sama.

## Fungsi ubah (change)

Semua fungsi ubah tidak butuh deposit NEAR, kecuali disebut lain.

### `create_deal` — dipanggil pembeli

```json
{
  "player_id": "lucas-1731400000",
  "player_name": "Lucas",
  "seller_id": "nordvik.<master>.testnet",
  "price": "10000000000000",
  "installments": [
    { "amount": "2500000000000", "due_offset_sec": 120 },
    { "amount": "2500000000000", "due_offset_sec": 240 },
    { "amount": "2500000000000", "due_offset_sec": 360 },
    { "amount": "2500000000000", "due_offset_sec": 480 }
  ],
  "collateral": "2500000000000",
  "sell_on_bps": 1500,
  "sell_on_basis": "gross",
  "training_clubs": [
    { "account_id": "kotafc.<master>.testnet", "name": "Kota FC", "bps": 400 },
    { "account_id": "akademidesa.<master>.testnet", "name": "Akademi Desa", "bps": 100 }
  ],
  "pdf_hash": "<64 hex>"
}
```

Mengembalikan `deal_id` (angka `u64`, mulai dari 0). Status awal `Proposed`.

Ditolak jika:
- jumlah semua `installments[].amount` ≠ `price`, atau `installments` kosong, atau ada cicilan bernilai 0;
- `due_offset_sec` tidak naik (harus urut dan tidak sama);
- total `training_clubs[].bps` > 500;
- `sell_on_bps` + total pembinaan > 10000;
- `sell_on_basis` bukan `"gross"` (basis bersih tidak didukung);
- `pdf_hash` bukan 64 karakter hex;
- `collateral` atau `price` bernilai 0, `player_id` kosong/lebih dari 64 karakter, lebih dari 24 cicilan atau 5 klub pembina (batas gas pembagian);
- `seller_id` sama dengan pembeli, atau klub pembina sama dengan penjual/pembeli, atau klub pembina ganda;
- `player_id` sudah pernah dipakai (penjualan berikutnya lewat `record_resale`).

Riwayat pembinaan (`training_clubs`) disimpan per `player_id` dan dipakai ulang saat penjualan ulang.

### `approve_deal({ deal_id })` — dipanggil penjual

`Proposed` → `Approved`. Ditolak jika pemanggil bukan penjual atau status bukan `Proposed`.

### `settle_due({ deal_id })` — siapa saja (termasuk Agen Penagih dengan kunci terbatas)

Tidak pernah panic untuk deal yang ada; selalu mengembalikan hasil:

| Hasil (`"result"`) | Arti |
|---|---|
| `"NotActive"` | deal bukan `Active`; tidak ada yang terjadi |
| `"NotDue"` | cicilan berikutnya belum jatuh tempo; tidak ada uang bergerak |
| `"PaidFromCollateral"` | cicilan berikutnya dibayar dari jaminan dan dibagi seperti cicilan biasa |
| `"Defaulted"` | jaminan < cicilan telat; deal menjadi `Defaulted`, tidak ada uang bergerak |

Bentuk nilai balik: `{ "result": "PaidFromCollateral", "installment_index": 1 }` (`installment_index` `null` untuk `NotActive`). Satu panggilan menyelesaikan paling banyak satu cicilan. Memanggil dua kali untuk cicilan yang sama aman: panggilan kedua menjawab `NotDue` (atau menangani cicilan telat berikutnya).

### `release_collateral({ deal_id })` — dipanggil pembeli

Mengembalikan seluruh sisa jaminan ke pembeli. Hanya saat status `Completed` atau `Resold`. Ditolak jika jaminan sudah 0.

### `record_resale({ player_id, new_buyer_id, fee, pdf_hash? })` — dipanggil pemilik pemain saat ini

`pdf_hash` opsional (hash PDF perjanjian Deal 2). Membuka deal penjualan ulang (`kind = "Resale"`, status `Approved`, satu pembayaran = `fee`, tanpa jaminan). Mengembalikan `deal_id` baru.

Ditolak jika: pemanggil bukan pemilik saat ini (pembeli deal terakhir), deal terakhir pemain belum `Completed`, sudah ada penjualan ulang yang belum dibayar, `fee` 0, atau `new_buyer_id` = pemanggil.

### `claim_pending()` — dipanggil penerima

Menarik semua fEUR milik pemanggil yang tertunda karena transfer sebelumnya gagal (mis. penerima belum `storage_deposit` di fEUR). Kalau transfer gagal lagi, jumlahnya kembali ke `pending`.

## Pembayaran: `ft_on_transfer` (dipanggil kontrak fEUR)

Klien memanggil di kontrak **fEUR**:

```
ft_transfer_call({ receiver_id: <FULLBACK>, amount: "<U128>", msg: "<JSON string>" })
deposit: 1 yoctoNEAR, gas: 250 TGas (disarankan; tiap penerima butuh 14 TGas, maksimal 7 penerima pada penjualan ulang)
```

`msg` (string JSON):

| `action` | Pengirim | Syarat | Efek |
|---|---|---|---|
| `{"action":"deposit_collateral","deal_id":0}` | pembeli | status `Approved`, jumlah ≥ jaminan | deal `Active`, jam jadwal mulai |
| `{"action":"top_up_collateral","deal_id":0}` | pembeli | status `Active`, jumlah ≥ kekurangan jaminan | jaminan kembali **penuh** |
| `{"action":"pay_installment","deal_id":0}` | pembeli | status `Active` | membayar cicilan berikutnya yang belum lunas (boleh sebelum jatuh tempo), lalu dibagi |
| `{"action":"pay_resale","deal_id":1}` | pembeli baru | deal `kind = "Resale"`, status `Approved`, jumlah ≥ `fee` | dibagi sekaligus; deal `Completed`, deal asal `Resold` |

Pembagian cicilan sebesar `A`: tiap klub pembina `A × bps / 10000`, sisanya ke penjual.

Pembagian penjualan ulang sebesar `F`: pemegang sell-on (penjual deal asal) `F × sell_on_bps / 10000`, tiap klub pembina `F × bps / 10000`, sisanya ke penjual deal ulang (pemilik saat ini).

## Fungsi lihat (view)

| Fungsi | Hasil |
|---|---|
| `get_config()` | `{ "ft_id": "feur...." }` |
| `get_deal({ deal_id })` | `Deal` atau `null` |
| `list_deals({ from_index?, limit? })` | `Deal[]` urut `deal_id` naik. Default `from_index = 0`, `limit = 50`, maksimum 100 |
| `list_deals_by_account({ account_id, from_index?, limit? })` | `Deal[]` di mana akun itu pembeli, penjual, pemegang sell-on, atau klub pembina |
| `get_events({ deal_id })` | `Event[]` riwayat deal itu |
| `verify_pdf_hash({ deal_id, pdf_hash })` | `true` jika sama persis (huruf besar/kecil diabaikan), `false` jika beda atau deal tidak ada |
| `get_pending({ account_id })` | `"<U128>"` jumlah tertunda |
| `get_player({ player_id })` | `{ player_id, player_name, owner_id, training_clubs, last_deal_id, open_resale_deal_id }` atau `null` |

### Bentuk `Deal`

```json
{
  "deal_id": 0,
  "kind": "Primary",
  "parent_deal_id": null,
  "player_id": "lucas-1731400000",
  "player_name": "Lucas",
  "seller_id": "nordvik...",
  "buyer_id": "portoalegre...",
  "price": "10000000000000",
  "installments": [
    { "amount": "2500000000000", "due_offset_sec": 120, "due_at_ns": "1731400120000000000",
      "paid": true, "paid_from_collateral": false, "paid_at_ns": "1731400050000000000" }
  ],
  "installments_paid": 1,
  "next_due_index": 1,
  "next_due_at_ns": "1731400240000000000",
  "collateral_required": "2500000000000",
  "collateral_balance": "2500000000000",
  "collateral_used_count": 0,
  "needs_top_up": false,
  "sell_on_bps": 1500,
  "sell_on_basis": "gross",
  "training_clubs": [ { "account_id": "kotafc...", "name": "Kota FC", "bps": 400 } ],
  "pdf_hash": "<64 hex>",
  "status": "Active",
  "created_at_ns": "...",
  "activated_at_ns": "...",
  "total_paid": "2500000000000",
  "training_paid": "125000000000"
}
```

- `kind`: `"Primary"` (dari `create_deal`) atau `"Resale"` (dari `record_resale`; `parent_deal_id` terisi, `sell_on_bps = 0`, `collateral_required = "0"`, satu cicilan dengan `due_offset_sec = 0`).
- `due_at_ns`, `activated_at_ns`, `next_due_at_ns` bernilai `null` sebelum deal aktif. `next_due_index`/`next_due_at_ns` `null` jika semua lunas.
- `total_paid`: total uang cicilan yang sudah dibagi (dari pembeli atau dari jaminan).
- `training_paid`: total Academy royalties yang sudah dibagi dari deal ini.

### Bentuk `Event` (NEP-297)

Setiap event juga ditulis ke log transaksi sebagai `EVENT_JSON:{"standard":"fullback","version":"1.0.0","event":"<nama>","data":[{...}]}`.
`get_events` mengembalikan:

```json
{ "event": "installment_paid", "deal_id": 0, "timestamp_ns": "...", "block_height": 123,
  "data": { ... } }
```

| `event` | `data` |
|---|---|
| `deal_created` | `{ buyer_id, seller_id, price, pdf_hash, kind }` |
| `deal_approved` | `{ seller_id }` |
| `collateral_deposited` | `{ amount }` |
| `installment_paid` | `{ installment_index, amount, from_collateral, payouts: [{ account_id, amount, role }] }` |
| `collateral_topped_up` | `{ amount, collateral_balance }` |
| `deal_defaulted` | `{ installment_index, collateral_balance }` |
| `deal_completed` | `{}` |
| `collateral_released` | `{ amount }` |
| `resale_recorded` | `{ resale_deal_id, new_buyer_id, fee }` (dicatat di deal asal) |
| `resale_paid` | `{ resale_deal_id, fee, payouts: [{ account_id, amount, role }] }` (dicatat di deal asal dan deal ulang) |
| `payout_failed` | `{ account_id, amount }` (jumlah masuk `pending`) |
| `pending_claimed` | `{ account_id, amount }` (tanpa `deal_id`; tidak masuk `get_events`) |

`role`: `"seller"`, `"training_club"`, `"sell_on"`, `"buyer_refund"`.

Kontrak tidak mengetahui hash transaksi. Web mengambil link explorer dari hasil transaksi yang dikirimnya sendiri; untuk riwayat, `block_height` bisa dibuka di `https://testnet.nearblocks.io/blocks/<block_height>`.

## Token fEUR (`contract/ft`)

NEP-141 + NEP-145 (storage) + metadata standar. `symbol = "fEUR"`, `decimals = 6`.

| Fungsi | Pemanggil | Isi |
|---|---|---|
| `new({ owner_id })` | deploy | inisialisasi, total supply 0 |
| `mint({ account_id, amount })` | **hanya** `owner_id` | menambah saldo; akun harus sudah `storage_deposit` |
| `storage_deposit`, `ft_transfer`, `ft_transfer_call`, `ft_balance_of`, `ft_total_supply`, `ft_metadata` | standar | standar NEP-141/145 |

Setiap akun yang menerima fEUR (klub, akademi, kontrak FULLBACK) harus `storage_deposit` dulu. Script setup melakukan ini untuk semua akun demo.

## Kunci terbatas Agen Penagih

`npm run setup:demo` (atau `scripts/add-keeper-key.sh`) menambah Function Call access key ke akun Penagih: `receiver_id = <FULLBACK>`, `method_names = ["settle_due"]`, allowance 2 NEAR (±130 panggilan `settle_due` dengan 150 TGas; Penagih harus membaca `get_deal` dulu dan hanya memanggil `settle_due` setelah `next_due_at_ns` lewat). Kunci ini tidak bisa memanggil `ft_transfer` di kontrak fEUR maupun mengirim NEAR. Agen memakai `KEEPER_PRIVATE_KEY` (kunci terbatas ini); kunci penuh akun Penagih hanya disimpan di `scripts/.env.demo` sebagai `KEEPER_FULL_ACCESS_PRIVATE_KEY`.

## Variabel env yang ditulis `npm run setup:demo`

Ditulis ke `scripts/.env.demo` (diabaikan git). Selain yang sudah ada di `.env.example`, ada variabel baru: `MASTER_PRIVATE_KEY` (dibaca, bukan ditulis), `CONTRACT_PRIVATE_KEY`, `DEMO_ACADEMY_1_ACCOUNT_ID`/`_PRIVATE_KEY` (Kota FC), `DEMO_ACADEMY_2_ACCOUNT_ID`/`_PRIVATE_KEY` (Akademi Desa), `KEEPER_FULL_ACCESS_PRIVATE_KEY`.

## Keputusan yang diambil di versi ini

Dua pertanyaan terbuka di `PLAN.md` dijawab sesuai usulan di sana (minta konfirmasi grup):

1. Cicilan **boleh** dibayar sebelum jatuh tempo.
2. Top up harus mengembalikan jaminan ke jumlah **penuh**.

Batasan yang disengaja: deal `Defaulted` tidak punya jalan keluar (tidak ada alur sengketa); sisa jaminan pada deal `Defaulted` tetap di kontrak.
