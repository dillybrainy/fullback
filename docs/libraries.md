# Libraries, tools, and templates

Wajib menurut aturan HACKATHON.md: sebutkan semua library dan template yang dipakai. Setiap pemilik folder **mengisi versi** dari `Cargo.toml` / `package.json` miliknya pada Jumat malam. Baris bertanda `[cek]` belum pasti dipakai: hapus kalau tidak dipakai.

| Library / tool | Versi | Lisensi | Dipakai di | Pemilik |
|---|---|---|---|---|
| near-sdk (Rust) | 5.x `[isi]` | MIT / Apache-2.0 | `contract/` | Orang 1 |
| near-contract-standards (NEP-141 untuk fEUR) | 5.x `[isi]` | MIT / Apache-2.0 | `contract/ft/` | Orang 1 |
| near-workspaces | `[isi]` | MIT / Apache-2.0 | `contract/tests/` | Orang 1 |
| near-cli-rs | `[isi]` | MIT / Apache-2.0 | `scripts/` (deploy, kunci Penagih) | Orang 1 |
| near-api-js **atau** near-kit `[cek, pilih satu]` | `[isi]` | MIT / Apache-2.0 | `agent/`, `scripts/`, route server `web/` | Orang 2 |
| zod | `[isi]` | MIT | `agent/schema.ts` | Orang 2 |
| openai (client untuk NEAR AI Cloud) `[cek]` | `[isi]` | Apache-2.0 | `agent/reader/` | Orang 2 |
| Ekstraksi teks PDF (mis. pdfjs-dist / unpdf) `[cek]` | `[isi]` | Apache-2.0 / MIT | `agent/reader/` | Orang 2 |
| Next.js (App Router) | `[isi]` | MIT | `web/` | Orang 3 |
| React | `[isi]` | MIT | `web/` | Orang 3 |
| @hot-labs/near-connect | `[isi]` | MIT `[cek]` | `web/` (login dompet) | Orang 3 |
| Template `create-near-app` / skill near-dapp `[cek]` | `[isi]` | MIT | kerangka awal `web/` | Orang 3 |
| Vitest / Jest `[cek]` | `[isi]` | MIT | `agent/tests/` | Orang 2 |
| reportlab (Python, hanya untuk membuat PDF contoh) | 5.0.1 | BSD | `sample-agreements/make_agreements.py` | Orang 4 |

## Aset desain

| Aset | Sumber | Lisensi / catatan |
|---|---|---|
| Font Schibsted Grotesk | Google Fonts | SIL Open Font License |
| Foto di Beranda (lapangan, akademi, stadion, tanda tangan) | Dibuat dengan Figma AI (generate image) | Gambar AI; tidak memuat logo atau orang sungguhan |
| Ikon (panah, kunci, sidik jari, dsb.) | Digambar sendiri sebagai SVG | Milik tim |
| Logo FULLBACK (final: opsi C "Goal Frame") | Dibuat tim, lihat `docs/brand/logo-C-*` | Milik tim |

## Alat AI yang dipakai saat membangun

Claude Code (Anthropic) dipakai oleh keempat anggota untuk menulis kode, dokumen, dan desain Figma. Sebutkan juga di form submit kalau ditanya.
