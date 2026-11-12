# Serah terima desain untuk Orang 3

File Figma: https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy

- Page **"Web app — all screens"** berisi semua layar. Page **"Logo — final: C Goal Frame"** berisi logo.
- Semua layer biasa dengan auto-layout, **tanpa component/instance**. Nama layer = nama bagian di kode (mis. `Hero/Headline`, `Button/Primary`, `Installment 1`).
- Untuk mengubah desain jadi kode, pakai skill `figma:figma-design-to-code` dengan link node di bawah.

## Cara membaca file

1. **Section 00–10, dari atas ke bawah**, mengikuti urutan user bertemu layarnya. Di dalam section, layar diurutkan kiri → kanan sesuai alur.
2. **Teks di atas tiap layar** berisi nama, route, dan siapa yang sedang melihat.
3. **Tab Prototype:** setiap tombol sudah tersambung ke layar tujuannya. Tekan ▶, lalu pilih salah satu flow:
   1. Public → Sign in
   2. Club selling
   3. Club buying → New deal
   4. Deal lifecycle
   5. Academy
   6. Federation
   7. Mobile
   8. Fase 2 · Judge demo
4. **Dev Mode → Annotations:** klik sebuah tombol untuk melihat catatannya: *On click → layar / route*, plus fungsi kontrak yang dipanggil (`create_deal`, `approve_deal`, `deposit_collateral`, `pay_installment`, `top_up_collateral`, `release_collateral`, `record_resale`, `claim_pending`).

## Flowchart aplikasi (FigJam)

- **[FULLBACK — screen flow](https://www.figma.com/board/NxLqsxK4FCjSVw0QL9CVCq):** perpindahan layar untuk tiap peran (Club, Academy, Federation).
- **[FULLBACK — deal lifecycle](https://www.figma.com/board/d8KzISLIJdLsVfzaRXgj28):** status deal Proposed → Approved → Active → Completed → Resold, dengan cabang Must top up → Defaulted.
- **[FULLBACK — how the money moves](https://www.figma.com/board/RyWjsDfoPKjSAhrPYPszSu):** collateral, collector agent, dan pembagian ke penjual, akademi, dan klub lama (sell-on).

## Peta layar

Tanda ⬜ = overlay (muncul di atas layar lain). Semua data Fase 1 netral (Riverside SC → Kingsport FC, R. Santos) dan di kode masuk `web/lib/mock.ts` sampai tersambung ke testnet.

### 01 · Public site
| Layar | Route | Node |
|---|---|---|
| Home | `/` | [13:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=13-2) |

### 02 · Sign in
| Layar | Route | Node |
|---|---|---|
| Sign in — wallet not connected | `/signin` | [44:514](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=44-514) |
| ⬜ Choose a wallet (UI dari near-connect) | — | [58:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=58-2) |
| Sign in — Club selected | `/signin` | [21:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=21-2) |
| Sign in — Academy selected | `/signin` | [57:560](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=57-560) |
| Sign in — Federation selected | `/signin` | [57:605](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=57-605) |

### 03 · Club · selling (Riverside SC)
| Layar | Route | Node |
|---|---|---|
| Dashboard — Selling | `/dashboard` | [19:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=19-2) |
| Deal — seller view (tanpa tombol aksi selama Active) | `/deals/[id]` | [20:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=20-2) |
| Verify a PDF | `/verify` | [24:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=24-2) |
| Dashboard — empty | `/dashboard` | [44:335](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=44-335) |

### 04 · Club · buying (Kingsport FC)
| Layar | Route | Node |
|---|---|---|
| Dashboard — Buying | `/dashboard?tab=buying` | [44:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=44-2) |
| New deal — 1 Upload | `/deals/new` | [57:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=57-2) |
| New deal — reading the PDF | `/deals/new` | [57:203](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=57-203) |
| New deal — 2 Review terms | `/deals/new` | [23:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=23-2) |
| New deal — 3 Ready to create | `/deals/new` | [57:403](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=57-403) |
| Deal — buyer view (harus top up) | `/deals/[id]` | [56:450](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-450) |
| Record a resale | `/deals/[id]/resale` | [24:72](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=24-72) |

### 05 · Deal lifecycle (halaman `/deals/[id]` di tiap status)
| # | Status · yang melihat | Tombol → tujuan | Node |
|---|---|---|---|
| 1 | Proposed · Kingsport FC | menunggu penjual | [56:58](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-58) |
| 2 | Proposed · Riverside SC | Approve deal → 3 | [56:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-2) |
| 3 | Approved · Kingsport FC | Deposit 2,000,000 → 4 | [56:114](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-114) |
| 4 | Active · Kingsport FC | Pay installment → 5 | [56:170](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-170) |
| 5 | Completed · Kingsport FC | Release collateral / Record a resale | [56:282](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-282) |
| 6 | Resold · siapa saja | lihat di nearblocks | [56:338](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-338) |
| 7 | Defaulted · siapa saja (cabang) | lihat di nearblocks | [56:226](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-226) |
| 8 | Payout waiting · Pine Hill Academy (cabang) | Claim 15,000 fEUR | [56:394](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-394) |

### 06 · Academy (Eastgate Youth)
| Layar | Route | Node |
|---|---|---|
| Dashboard — Academy royalties (tanpa New deal) | `/dashboard` | [44:170](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=44-170) |

### 07 · Federation (read-only)
| Layar | Route | Node |
|---|---|---|
| Federation overview | `/federation` | [22:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=22-2) |
| Deal — federation view (banner Observer, tanpa aksi) | `/deals/[id]` | [56:649](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=56-649) |

### 08 · Overlays and system states
| Layar | Dipakai di | Node |
|---|---|---|
| ⬜ Tx 1 · Confirm in wallet → otomatis ke Tx 2 | setiap aksi on-chain | [42:7](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-7) |
| ⬜ Tx 2 · Sending → otomatis ke Tx 3 | | [42:28](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-28) |
| ⬜ Tx 3 · Confirmed (link nearblocks) | | [42:41](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-41) |
| ⬜ Tx 4 · Failed (error mentah dari NEAR) | | [42:53](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-53) |
| ⬜ Account menu (Switch role, nearblocks, Disconnect) | tombol Account di nav | [58:30](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=58-30) |
| ⬜ Status filter | tombol "All statuses" | [58:50](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=58-50) |
| Toasts (kejadian dari collector agent) | kanan bawah, 6 detik | [42:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-2) |
| System states: salah network, NEAR tidak merespons, Observer, wallet terputus, 404, loading | di bawah nav | [48:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=48-2) |

### 09 · Mobile 390
| Layar | Node |
|---|---|
| Home — mobile | [45:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=45-2) |
| ⬜ Mobile menu — public | [58:67](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=58-67) |
| Deal — mobile (buyer view) | [47:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=47-2) |
| ⬜ Mobile menu — app | [58:90](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=58-90) |

Halaman lain mengikuti aturan yang sama:

- Padding samping 16–20.
- Semua kartu satu kolom; stat 2×2.
- Tombol utama lebar penuh, tinggi 48–52.
- Menu jadi tombol ☰.
- Tabel Dashboard jadi daftar kartu (satu kartu per deal).

### 10 · Fase 2 · Judge demo (dibangun setelah Fase 1 jalan di testnet)
| Layar | Route | Node |
|---|---|---|
| Judge demo — Start | `/demo` | [35:110](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=35-110) |
| Deal — demo Lucas | `/demo/deal` | [34:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=34-2) |
| Resale — demo Lucas | `/demo/resale` | [35:2](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=35-2) |
| Judge bar — semua langkah | spec `JudgeDemoBar.tsx` | [42:81](https://www.figma.com/design/t0bCiQ7v8du6xMv9he9Smy?node-id=42-81) |

Cara kerja bilah demo:

- Bilah demo adalah **satu komponen kode** (`JudgeDemoBar.tsx`, PLAN U7) yang ditempel di atas halaman Fase 1.
- Tombol kuning = langkah berikutnya, selalu satu saja.
- Hitung mundur memakai jatuh tempo on-chain (KTD4: aktif + *i* × 120 detik).
- "View as …" mengganti sudut pandang klub.

## Aturan perilaku

- **Peran menentukan tombol yang tampil:**
  - Penjual tidak punya tombol aksi selama deal Active; dia hanya menunggu dibayar.
  - Pembeli punya Deposit, Pay, Top up, Release, dan Record a resale.
  - Akademi hanya Claim (kalau payout tertahan).
  - Federation selalu read-only dan memakai banner Observer.
- **Setiap aksi on-chain memakai modal Tx 1 → 2 → 3** (atau Tx 4 kalau gagal), lalu halaman di-refresh ke status baru. Kejadian latar dari collector agent cukup ditampilkan sebagai toast.
- **Tag status selalu berbentuk "kartu":** kuning = perlu tindakan, merah = default, hijau = beres.
- **Loading memakai skeleton**, bukan spinner.
- **Tab Buying/Selling** di Dashboard memfilter `list_deals` untuk akun yang sama. Di prototype, tab ini lompat ke contoh klub lain supaya kedua sisi terlihat.

## Token

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--bg` | `#F3F4EF` | Latar halaman |
| `--surface` | `#FFFFFF` | Kartu |
| `--ink` | `#111111` | Teks utama |
| `--muted` | `#666666` | Teks sekunder (kontras 5,7:1 di putih) |
| `--line` | `#E9E9E9` | Garis tabel |
| `--track` | `#E8EAE3` | Latar menu segmented |
| `--primary` | `#13235B` | Tombol utama, logo |
| `--primary-deep` | `#0F1A3D` | Footer, panel gelap |
| `--card-yellow` | `#FFD60A` | Kartu kuning, banner "harus top up", bola di logo |
| `--yellow-soft` / text | `#FFF3B0` / `#5C4700` | Tag "Buyer must top up" |
| `--green-soft` / text | `#E7F4EC` / `#1E6B3A` | Tag Active / Paid |
| `--red` / soft | `#B42318` / `#FBECEA` | Defaulted, agen curang, PDF tidak cocok |

**Font:** Schibsted Grotesk (Google Fonts) dengan bobot 400, 500, dan 600. Judul memakai bobot 500 dengan letter-spacing −2%.

**Skala teks:**

| Pemakaian | Ukuran |
|---|---|
| Hero | 80/84 |
| Judul halaman | 48 |
| Judul section | 56 atau 48 |
| Judul kartu | 24 |
| Body | 16/24 |
| Kecil | 13 |

**Radius:**

| Elemen | Radius |
|---|---|
| Kartu | 24 |
| Panel besar | 32 |
| Tombol | 12 |
| Input | 12 |
| Tag/pill | 999 |

**Tombol:** tinggi 44–48, padding horizontal 22, teks 15 Medium.
- Primer: navy dengan teks putih.
- Sekunder: putih atau `--bg`.

**Layout:** lebar 1440, konten 1280 (padding 80), jarak antarkartu 16.

## Gambar

Foto Beranda dibuat dengan Figma AI dan tersimpan di file Figma.

1. Ekspor dari layer `Photo/...` (klik kanan → Export → JPG 2x).
2. Taruh hasilnya di `web/public/images/`.

Hero memakai gradient terang di atas foto supaya teks terbaca (lihat fill layer `Hero`).

## Logo (final: opsi C "Goal Frame")

Logo C sudah dipilih tim pada 12 Nov 2026 dan sudah terpasang di semua layar di Figma (layer `Logo/Goal Frame`).

| Pakai untuk | File |
|---|---|
| Nav, di latar terang | `docs/brand/logo-C-goal-frame-icon.svg` |
| Footer, panel navy | `docs/brand/logo-C-goal-frame-icon-white.svg` |
| Favicon dan app icon | `docs/brand/logo-C-goal-frame-app-icon.svg` |

Wordmark tetap teks "fullback" (Schibsted Grotesk 500), ditaruh di sebelah kanan ikon.

## Hal yang sengaja masih placeholder

- Isi dari data asli: `[hash from contract]`, `[sha-256 …]`, `[raw error returned by NEAR]`, dan hash transaksi `Tx 7Hk2…9QaF`.
- Angka di Federation view (12 deal, 48.5M, dst.) hanya contoh. Di kode, hitung dari `list_deals`.
- Logo wallet di overlay "Choose a wallet" hanya huruf. Daftar dan logo aslinya datang dari near-connect.
