# Evaluasi model NEAR AI Cloud untuk AI Reader

**Tanggal:** 14 November 2026 · **Oleh:** Orang 2 (AI agents / backend)

Dokumen ini mencatat evaluasi pemilihan model untuk Reader (`agent/reader/llm.ts`).
Pemicunya: pada 14 Nov, tes live Reader yang **lulus saat audit 13 Nov tiba-tiba
gagal** dengan `400 Model 'deepseek-ai/DeepSeek-V3.1' not found`. Model default
lama sudah **dihapus dari katalog NEAR AI Cloud**, sehingga Reader live akan crash
bila dipakai juri/Orang 3.

File mentah keluaran vitest ada di [`raw/`](raw/).

---

## 1. Metode

- **Kriteria lulus = tes live Reader** (`tests/reader-live.test.ts`), bukan "model
  bisa menjawab". Tes ini menuntut **semua** hal berikut sekaligus:
  - Angka R2/R3 benar: fee `10.000.000`, 4 × `2.500.000`, collateral `2.500.000`,
    sell-on `1500 bps` `gross`, Kota FC `400 bps`, Akademi Desa `100 bps`.
  - `pdfHash` = `eab47557…` (sidik jari PDF commit).
  - `warnings = []` → setiap kutipan **verbatim** di teks PDF (R14).
- Model diuji lewat env `NEARAI_MODEL` **tanpa mengubah kode**, lalu pemenang
  dikunci sebagai `DEFAULT_MODEL`.
- **Stabilitas diukur 3× per kandidat.** Lulus 1× **tidak** dianggap cukup untuk
  demo yang tidak boleh crash. Ini terbukti penting (lihat §3).

## 2. Katalog model aktual (`GET /v1/models`)

`deepseek-ai/DeepSeek-V3.1` memang sudah tidak ada. Contoh model yang tersedia:
`anthropic/claude-*`, `deepseek/deepseek-v3.2`, `deepseek-ai/DeepSeek-V4.1-Flash-*`,
`google/gemini-*` (flash / flash-lite / pro), `openai/gpt-*`, `moonshotai/kimi-*`,
`qwen/*`, `x-ai/grok-*`, `z-ai/glm-*`, dll. (daftar penuh berubah sewaktu-waktu).

## 3. Hasil

### 3a. Uji sekali jalan (layak/tidak)

| Model | Hasil | Penyebab gagal | Durasi |
|---|---|---|---|
| `deepseek/deepseek-v3.2` | ❌ FAIL | 3 kutipan cicilan (pasal 3.2) **tidak verbatim** → `warnings` terisi | ±24s |
| `anthropic/claude-sonnet-5` | ✅ PASS | — | ±8s |
| `anthropic/claude-haiku-5-5` | ✅ PASS | — | 7,9s |
| `openai/gpt-5.4-nano` | ✅ PASS (sekali) | — | 7,7s |
| `openai/gpt-5.4-mini` | ❌ FAIL | field **`collateral` hilang** (`undefined`) | 3,7s |
| `google/gemini-2.5-flash-lite` | ✅ PASS | — | **3,8s** |
| `deepseek-ai/DeepSeek-V4.1-Flash-1017` | ✅ PASS | — | 61,6s (sangat lambat) |

### 3b. Uji stabilitas 3× (yang menentukan keputusan)

| Model | Pass-rate | Durasi | Keputusan |
|---|---|---|---|
| `google/gemini-2.5-flash-lite` | **3/3** ✅ | 3,8s | **Dipilih** |
| `anthropic/claude-haiku-5-5` | **3/3** ✅ | 7,9s | Cadangan |
| `google/gemini-3.1-flash-lite` | **3/3** ✅ | ~4s | Cadangan |
| `openai/gpt-5.4-nano` | **1/3** 🔴 | 7,7s | Ditolak (flaky) |

> **Temuan kunci:** `gpt-5.4-nano` lolos 1× pertama, tetapi hanya **1/3** saat
> diulang. Kalau evaluasi berhenti di 1 run, model inilah yang akan terpilih —
> dan 2 dari 3 demo berpotensi gagal. **Ukuran model ≠ kepatuhan ekstraksi.**
> `gpt-5.4-mini` ("lebih pintar") malah menghilangkan field `collateral`.

## 4. Analisis

- Kegagalan bukan soal "kecil vs besar", melainkan **kepatuhan menyalin verbatim**
  (R14) dan **kelengkapan field**. Ini penyakit umum LLM pada tugas ekstraksi.
- Solusi struktural yang menghapus risiko ini sepenuhnya: **kutipan diambil oleh
  kode dari teks PDF** (verbatim *by construction*), bukan diketik model. Model
  cukup menandai lokasi/klausa. Ini juga menurunkan cost. **Belum diimplementasi**
  (refactor `enrich`/prompt; `schema.ts` tetap beku). Direkomendasikan sebagai
  hardening lanjutan pasca-hackathon.
- **Cost saat demo juri = $0.** `DEMO_MODE=true` memetakan hash PDF → fixture
  (KTD6), tanpa panggilan LLM. Model live hanya untuk PDF baru / bukti "live Reader".

## 5. Keputuan

**Default: `google/gemini-2.5-flash-lite`** — lulus 3/3, tercepat, dan termurah di
kelasnya (flash-lite). Cocok dengan kebutuhan menekan cost tanpa mengorbankan
keandalan demo. `NEARAI_MODEL` tetap tersedia sebagai override tanpa ubah kode.

- Cadangan (jika ingin lintas-vendor): `anthropic/claude-haiku-5-5` (3/3).
- Ditolak: `gpt-5.4-nano` (flaky 1/3), `gpt-5.4-mini` (hilang `collateral`),
  `deepseek-v3.2` (kutipan tidak verbatim), `DeepSeek-V4.1-Flash-1017` (lambat 61s).

## 6. Cara mengulang evaluasi

```bash
# uji satu model tertentu
LIVE_TEST=1 NEARAI_MODEL="<vendor/model>" npm test -w agent -- tests/reader-live.test.ts

# daftar model yang tersedia (perlu NEARAI_API_KEY di .env)
curl -s https://cloud-api.near.ai/v1/models -H "Authorization: Bearer $NEARAI_API_KEY"
```

Catatan: harga per token tidak dicatat di sini karena katalog NEAR AI Cloud tidak
mengekspos harga lewat `/v1/models`; pemilihan "termurah" berdasar kelas model
(flash-lite/nano/haiku = entry tier) + durasi sebagai proksi.
