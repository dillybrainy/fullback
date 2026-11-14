# Deal 0 — R. Santos (Riverside SC → Kingsport FC)

PDF contoh untuk data netral Fase 1 (sama dengan `web/lib/mock.ts`): fee 6,000,000, 3 cicilan × 2,000,000 (1 Oct, 1 Nov, 1 Dec 2026), jaminan 2,000,000, sell-on 10%, akademi Pine Hill (13–15 → 0.75%) dan Eastgate Youth (16–20 → 2.5%).

| File | SHA-256 | Dipakai untuk |
|---|---|---|
| `deal0-riverside-kingsport.pdf` | `c466847f82d4a2e72a65d09d8f33bd4d4f71922dd82f0083525b195a929a0fb8` | PDF asli. Verify → "It matches" |
| `deal0-riverside-kingsport-TAMPERED.pdf` | `c17d852c64586ba0beadab74cfa2b962f7960a044beb0c2bf0767b2b276a3210` | Sama persis, kecuali sell-on 10% diganti 5% (pasal 5.1). Verify → "It doesn't match" |

Dibuat ulang: `python3 make_santos.py sample-agreements` (reportlab, output deterministik).

Catatan untuk Orang 2: hash ini belum ada di fixture Reader. Dengan `DEMO_MODE=true`, New deal hanya menerima PDF Lucas. Kalau mau PDF ini bisa dibaca di New deal, tambahkan fixture `deal0.json` dengan hash di atas.
