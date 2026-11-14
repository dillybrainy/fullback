# Audit Day 2 — Smart contract & Agen AI (Orang 2)

**Tanggal audit:** Sabtu, 14 November 2026
**Ruang lingkup:** `contract/` (kontrak FULLBACK + token fEUR) dan `agent/` (AI Reader + Collector)
**Acuan:** `PLAN.md` (R2–R16, KTD1–KTD12, unit U2–U5), `contract/INTERFACE.md`, `agent/schema.ts`
**Metode:** membaca kode, riwayat Git (authorship), dan **menjalankan ulang seluruh tes yang tersedia**. Setiap klaim pada dokumen ini dibuktikan dengan output perintah, bukan dugaan.

> Dokumen ini menilai **kondisi aktual per 14 Nov**, meneruskan `docs/AUDIT-DAY-1.md`. Fokus audit ini adalah dua bagian teknis inti: kontrak (uang & aturan) dan agen AI (pembaca + penagih).

---

## 0. Koreksi penamaan pemilik (PENTING)

Permintaan audit menyebut *"orang 4 yang pegang smartcontract"*. **Bukti authorship Git menunjukkan ini keliru.** Kontrak dikerjakan oleh **Orang 1**, bukan Orang 4.

| Folder | Commit (author) | Unit di PLAN | Kesimpulan |
|---|---|---|---|
| `contract/` | **RANGGAWIKAN WASTUSATWIKA** (3 commit: U2 kontrak + fEUR + INTERFACE.md, U3 wasm + skrip) + `dillybrainy` (1, minor) | U2, U3 = **Orang 1** | Kontrak = **Orang 1** |
| `agent/` | **Rio Meidi Ataurrahman** (U4 Reader + U5 Collector) | U4, U5 = **Orang 2** | Agen = **Orang 2** |
| `docs/` | Rio Meidi (5), RANGGAWIKAN (2), `dillybrainy` (2) | U8 = **Orang 4** | Dokumen/desain = **Orang 4** (`dillybrainy`) |

**Implikasi:** label peran di repo ini perlu diluruskan ke tim. Secara isi, audit ini tetap mencakup **`contract/`** (yang diminta) dan **`agent/`** (Orang 2), karena keduanya adalah inti teknis yang dimaksud.

---

## 1. Ringkasan satu menit

| Bagian | Target | Penilaian | Kondisi aktual |
|---|---|---|---|
| Kontrak FULLBACK + fEUR (Orang 1) | U2 + U3: kontrak inti, tes, hash PDF, resale, deploy | **Isi sangat kuat; tes 34/34 hijau** | Belum deploy (alamat masih `<master>`), audit keamanan resmi belum ada |
| Agen AI (Orang 2) | U4 + U5: Reader, training bps, Collector, illegal-attempt | **Isi lengkap; tes 37 lulus + 1 live lulus** | Placeholder `<master>` belum terganti; uji testnet Collector belum bisa |

**Jalur kritis tetap sama dengan Day 1:** belum ada deploy testnet → tidak ada bukti transaksi on-chain, link explorer, uji Collector live, maupun demo kunci terbatas sungguhan. **Kode sudah matang; yang belum ada adalah bukti di jaringan.**

---

## 2. Smart contract (`contract/`) — pemilik Orang 1

### Hasil tes aktual (dijalankan ulang 14 Nov)

`cargo test` di `contract/`:

| Bagian | Hasil | Cakupan |
|---|---:|---|
| Unit fEUR | 3 lulus | `owner_can_mint`, `mint_by_non_owner_is_rejected`, `mint_to_unregistered_account_is_rejected` |
| `tests/deal1.rs` | 24 lulus | cicilan, jaminan, telat→jaminan, top-up, Defaulted, pembagian bps, tolak token palsu, tolak cicilan ≠ harga, tolak royalti >5%, tolak basis `net`, kelebihan bayar, `pending`, dll. |
| `tests/resale.rs` | 7 lulus | hash PDF, resale sebelum Completed ditolak, resale bukan pemilik ditolak, pembagian Deal 2 |
| **Total** | **34 lulus, 0 gagal** | |

**Kesimpulan:** logika aturan uang (R2–R16) diuji menyeluruh dan **semua lulus**. Ini kualitas tes yang tinggi untuk ukuran hackathon.

### Bukti keamanan inti (dibaca dari `contract/src/lib.rs` & `contract/ft/src/lib.rs`)

| Syarat | Bukti di kode | Status |
|---|---|---|
| **R15** — hanya token fEUR diterima | `ft_on_transfer`: `require!(env::predecessor_account_id() == self.ft_id, "Only the official fEUR token is accepted")` | ✅ |
| **R16** — pembayaran gagal → `pending`, bisa diklaim | map `pending`, `claim_pending()` (emit `pending_claimed` lalu `payout`) | ✅ |
| **KTD2** — `mint` hanya pemilik token | `require!(env::predecessor_account_id() == self.owner_id, "Only the token owner can mint")` | ✅ |
| Validasi input `create_deal` | `require!` berlapis: harga > 0, jaminan > 0, 1–24 cicilan, jumlah cicilan == harga, royalti ≤ 500 bps, tolak basis `net`, ada cap jumlah klub pembina | ✅ kuat |
| **R13** — kunci terbatas Penagih | Dijelaskan di `agent/collector/illegal-attempt.ts` (`method_names=["settle_due"]`, `allowance=2 NEAR`, tanpa hak transfer token) | ✅ (sisi desain; bukti on-chain menyusul) |

Catatan: README menyebut `near-workspaces`, sedangkan tes aktual adalah unit test near-sdk dengan simulasi ledger. Ini **disengaja** (sandbox NEAR tidak jalan di Windows) dan sudah dicatat sejak Day 1 — bukan cacat, tapi perlu kejujuran di README.

### Kesenjangan (contract/)

1. **Belum deploy ke testnet.** `contract/INTERFACE.md` baris 12–13 masih `fullback.<master>.testnet` / `feur.<master>.testnet` (ditandai "diisi setelah deploy"). Tanpa ini: tidak ada link explorer, tidak ada `npm run demo`, tidak ada bukti R17.
2. **Audit keamanan resmi (`near-contract-audit`) belum terdokumentasi.** PLAN mensyaratkannya sebelum deploy final (Verification Contract).
3. **Alasan hukum/status masih "draft"** pada INTERFACE.md menurut catatan Day 1 — persetujuan 4 orang atas interface belum dicatat hitam di atas putih.
4. **Uji integrasi testnet belum bisa dijalankan** (bergantung poin 1): `run-demo` dua kali, uji kunci terbatas, resale on-chain.

---

## 3. Agen AI (`agent/`) — pemilik Orang 2

### Hasil tes aktual (dijalankan ulang 14 Nov)

`npm test -w agent`:

| Bagian | Hasil | Cakupan |
|---|---:|---|
| `training.test.ts` | 10 lulus | bps dari umur (KTD5): 12–15=100, 16–23=400, mulai 14→50, 24+=0, tolak rentang tak valid |
| `schema.test.ts` | 7 lulus | helper konversi, fixture Deal 1/2 lolos zod & cocok R2/R4 |
| `collector.test.ts` | 11 lulus | `tick()`: sekali utk 1 telat, tidak kirim bila tak ada, lewati yang belum jatuh tempo/non-Active, multi-deal, idempoten, `explorer_link`, paging >100 |
| `reader.test.ts` | 9 lulus | kutipan verbatim/mengarang (R14), basis `net` ditolak, cicilan ≠ harga, klub tak dikenal, hash demo→fixture, PDF asing ditolak |
| `reader-live.test.ts` | 1 lulus (live) | **NEAR AI Cloud asli**: angka R2/R3 benar + `warnings=[]` |
| **Total** | **37 lulus + 1 live lulus, 0 gagal** | |

`npm run typecheck -w agent`: **lulus** (tanpa error TypeScript).

### Temuan penting sejak Day 1 — model NEAR AI Cloud (SUDAH diperbaiki)

Pada 14 Nov, model default `deepseek-ai/DeepSeek-V3.1` **dihapus dari katalog NEAR AI Cloud** → Reader live sempat crash (`400 Model not found`). Ini **bukan** kesalahan kode kita.

- **Diperbaiki** di `agent/reader/llm.ts`: default → `google/gemini-2.5-flash-lite`, dipilih lewat **pengukuran** (uji stabilitas 3/3, kutipan verbatim R14, angka R2/R3 benar), termurah & tercepat di kelasnya.
- Kandidat ditolak dengan alasan terukur: `gpt-5.4-nano` (flaky 1/3), `gpt-5.4-mini` (field `collateral` hilang), `deepseek-v3.2` (kutipan tidak verbatim).
- Data evaluasi lengkap: `agent/eval/README.md` + `agent/eval/raw/`.
- **Bukti:** tes live lulus (±3,4–4,6 dtk). `NEARAI_MODEL` tetap tersedia sebagai override.

### Bukti desain (agent/)

| Syarat | Bukti | Status |
|---|---|---|
| **KTD5** — bps dihitung kode, bukan LLM | `agent/training.ts` (uji 10 kasus) | ✅ |
| **R14** — kutipan wajib verbatim | `agent/reader/quotes.ts` + penanda `warnings[]`, tombol "Buat deal" diblokir bila ada `quote_not_found` | ✅ |
| **R12** — SHA-256 PDF | `agent/reader/pdf.ts` (`readPdf` → `{output, pdfHash}`) | ✅ |
| **KTD6** — DEMO_MODE tanpa API key | `agent/reader/index.ts` cocokkan hash→fixture | ✅ |
| **R8/KTD7** — Collector `tick()` | `agent/collector/index.ts` (baca view dulu, hanya kirim `settle_due` bila lewat jatuh tempo) — hemat allowance | ✅ |
| **R13** — demo agen curang | `agent/collector/illegal-attempt.ts` | ✅ (desain; bukti on-chain menyusul) |

### Kesenjangan (agent/)

1. **Placeholder `<master>` belum terganti** di `clubs.json`, `fixtures/*.json`, `reader/index.ts`. Bergantung nama akun master dari deploy (Orang 1). *Ini blocker eksternal, bukan kelalaian Orang 2.*
2. **Uji Collector & illegal-attempt di testnet belum bisa** — butuh kontrak yang sudah di-deploy + kunci keeper.
3. **Batas yang perlu dijaga:** jangan menutupi masalah CRLF PDF Windows dengan menambah hash CRLF ke fixture (larangan audit Day 1). Pemecahan `.gitattributes` milik Orang 4.

---

## 4. Matriks bukti lengkap

| Pemeriksaan | Hasil | Bukti/batas |
|---|---|---|
| `cargo test` (contract/) | **Lulus 34/34** | Unit/simulasi lokal, bukan deploy testnet |
| `npm test -w agent` | **Lulus 37 + 1 live** | Live test jalan dengan API key |
| `npm run typecheck -w agent` | **Lulus** | — |
| Live NEAR AI Cloud Reader | **Lulus 1/1** | Model `gemini-2.5-flash-lite`, angka R2/R3 + `warnings=[]` |
| R15 tolak token non-fEUR | **Ada & lulus** | `require!(predecessor == ft_id)` + `tokens_other_than_feur_are_rejected_and_returned` |
| R16 `pending` + `claim_pending` | **Ada & lulus** | `claim_pending()` + tes terkait |
| KTD2 `mint` hanya owner | **Ada & lulus** | `mint_by_non_owner_is_rejected` |
| Deploy testnet | **Belum** | alamat masih `<master>` |
| `npm run demo` ×2 | **Belum dapat dites** | bergantung deploy |
| Collector & rogue-agent on-chain | **Belum dapat dites** | butuh deploy + kunci keeper |
| Audit keamanan kontrak resmi | **Belum dibuktikan** | `near-contract-audit` belum jalan |
| Demo Vercel/juri | **Belum ada** | `web/` belum dibangun (di luar lingkup audit ini) |

---

## 5. Penilaian akhir yang adil

- **Kualitas kode & tes dua bagian ini sangat tinggi.** 34 tes kontrak + 38 tes agen mencakup alur uang, kasus batas, dan kasus gagal — jauh melampaui sekadar "bisa jalan".
- **Keamanan inti sudah dipikirkan matang:** validasi token (R15), `pending` (R16), `mint` owner-only (KTD2), input `create_deal` yang defensif, dan desain kunci terbatas (R13).
- **Satu bug nyata (model NEAR AI Cloud) berhasil ditangani** dengan pendekatan terukur + terdokumentasi + terevaluasi.
- **Yang belum ada bukan kode, melainkan bukti on-chain:** deploy testnet. Inilah satu-satunya penghalang menuju link explorer, `npm run demo`, uji Collector live, dan demo kunci terbatas — semuanya syarat Definition of Done.
- **Audit Day 2 tidak menemukan gap tes yang dikhawatirkan** (mis. tes `mint` non-pemilik): ternyata **ada**. Ini mengoreksi dugaan awal audit dan menegaskan pentingnya verifikasi berbasis bukti.

---

## 6. Tindakan berikutnya (prioritas, urut)

1. **[Orang 1]** Dapatkan akun master testnet berdana → deploy `fullback.wasm` + `feur.wasm` → isi alamat di `INTERFACE.md` (ganti semua `<master>`).
2. **[Orang 1]** Jalankan `near-contract-audit` sebelum deploy final; simpan hasilnya.
3. **[Orang 2]** Setelah deploy: ganti `<master>` di `clubs.json`/`fixtures`, uji `tick()` Collector live, jalankan `illegal-attempt` dan pastikan blockchain menolaknya (AE4/R13).
4. **[Orang 1]** `npm run demo` dua kali berturut-turut; simpan link explorer di `docs/progress/orang-1.md`.
5. **[Orang 4]** Tetapkan `.gitattributes` `*.pdf -text` (keputusan tim) untuk menuntaskan isu CRLF; luruskan label peran di dokumen (lihat §0).
6. **[Tim]** Kunci alamat kontrak + nama akun master di `.env` tim (di luar git).

---

## 7. Catatan metodologi

- Semua angka pada dokumen ini berasal dari **menjalankan ulang tes** pada 14 Nov (`cargo test`, `npm test -w agent`, `LIVE_TEST=1 ... reader-live.test.ts`), bukan menyalin klaim sebelumnya.
- Authorship ditentukan dari `git log --format='%an' -- <folder>`.
- Audit ini **tidak** mengubah kode apa pun dan **tidak** melakukan commit/push/PR (sesuai aturan PLAN bahwa hanya manusia yang boleh menjalankan `git commit`/`push` dan membuat PR).
- Ini **bukan** audit keamanan formal menyeluruh; verifikasi menyeluruh kontrak tetap melalui `near-contract-audit`.
