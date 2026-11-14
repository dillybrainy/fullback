# Checklist submit (Sabtu 14 Nov, sebelum 23:59 UTC = Minggu 06:59 WIB)

Target tim: form terkirim **Sabtu malam WIB**. Hanya manusia yang mengerjakan langkah bertanda 👤.

## Urutan hari Sabtu

1. **Siang:** cek semua poin "Definition of Done" di bawah. Kalau ada yang merah, perbaiki dulu.
2. **Sore:** rekam video sesuai `docs/video-script.md`, rakit (lihat `docs/video-prompts.md`), lalu upload ke YouTube sebagai *unlisted*. 👤
3. **Sore:** isi placeholder di README (`[VERCEL_URL]`, `[VIDEO_URL]`, `[CONTRACT_ID]`, nama tim, `near-api-js`/`near-kit`), lalu commit.
4. **Malam:** ubah repo GitHub jadi **publik**. 👤 Sebelumnya cek riwayat git bersih dari `.env`, kunci privat, dan seed phrase (`git log -p | grep -iE "ed25519:|seed|PRIVATE_KEY="`).
5. **Malam:** posting di X (draft di bawah). 👤
6. **Malam:** isi form submit **sekali** (tidak bisa diedit). 👤

## Definition of Done (dari PLAN.md)

- [ ] Repo jalan dengan `cp .env.example .env && npm install && npm run dev` di clone baru (diuji orang yang tidak membangunnya)
- [ ] Demo online bisa diklik dari upload PDF sampai pembagian penjualan ulang, tanpa dompet
- [ ] Setiap transaksi di UI punya link nearblocks yang bisa dibuka
- [ ] Verifikasi: `deal1-nordvik-portoalegre.pdf` ✓, `deal1-TAMPERED.pdf` ✗
- [ ] Agen curang ditolak blockchain, terlihat di UI dan video
- [ ] Saldo akhir semua pihak sama persis dengan R3 dan R4
- [ ] README menyebut semua tools NEAR dan library; kode lama: tidak ada; LICENSE MIT ada
- [ ] Tidak ada `.env`, kunci privat, atau seed phrase di riwayat git
- [ ] Kode percobaan yang tidak terpakai sudah dihapus
- [ ] Video dan post X sudah tayang, repo publik, form diisi sekali
- [ ] Demo online tetap hidup sampai 18 Nov (jangan matikan Vercel atau hapus akun testnet)

## Draft post X 👤

Wajib ada "built at NEAR HACKATHON", @NEARProtocol, dan #NEARHackathon. Pilih satu, lalu lampirkan video atau GIF 20 detik dari adegan S06–S07.

**Versi A (masalah dulu)**
```
Botafogo was banned for 3 transfer windows over an unpaid €8m fee.

We built FULLBACK at NEAR HACKATHON: a NEAR contract that holds the buyer's collateral, collects every installment, and pays academies + sell-on holders in one transaction.

Try it, no wallet needed 👇
[VERCEL_URL]

@NEARProtocol #NEARHackathon
```

**Versi B (demo dulu)**
```
We told our AI agent to steal the money.
NEAR said no. 🟥

FULLBACK, built at NEAR HACKATHON: football transfers where late installments are paid from collateral and every club that trained the player gets its share, automatically.

Demo → [VERCEL_URL]
Code → [GITHUB_URL]

@NEARProtocol #NEARHackathon
```

## Draft isi form submit 👤

Sesuaikan dengan kolom form yang sebenarnya.

- **Project name:** FULLBACK
- **Tagline (≤ 80 karakter):** Transfer fees that collect and split themselves, on NEAR.
- **Short description:**
  > Clubs that sell players on installments often never get paid, and the only remedy is a FIFA claim that takes years. FULLBACK turns the transfer agreement into a NEAR contract: an AI reader extracts the terms with clause quotes, the contract holds the buyer's collateral, a collector agent with a restricted key settles late installments from collateral, and every payment is split between the seller, the academies that trained the player, and any sell-on holder. The agreement's SHA-256 fingerprint is stored on-chain, and federations get a read-only view of every deal.
- **NEAR tools used:** near-sdk (Rust), NEP-141 fEUR token, function-call access keys, NEP-297 events, near-workspaces, near-cli-rs, `near-api-js`, @hot-labs/near-connect, NEAR AI Cloud, testnet.nearblocks.io
- **Live demo:** `[VERCEL_URL]`
- **Repository:** `[GITHUB_URL]`
- **Video:** `[VIDEO_URL]`
- **X post:** `[X_POST_URL]`
- **Prior work:** None. All code was written during the hackathon.
- **AI tools used:** Claude Code (code, docs, design), NEAR AI Cloud (in-product Reader), Figma AI (marketing photos).
