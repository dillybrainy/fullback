/**
 * agent/usage/types.ts — Interface untuk monitoring NEAR AI Cloud.
 *
 * Dipakai untuk memantau: (1) kesehatan layanan & model, (2) perkiraan pemakaian
 * token & biaya, (3) sisa usage/balance. Semua bentuk respons di bawah mengikuti
 * skema OpenAPI resmi NEAR AI Cloud (docs.near.ai/api-reference), bukan karangan.
 *
 * Catatan akses (dibuktikan lewat tes, 14 Nov):
 *  - `/v1/health`            -> publik, tanpa auth. SELALU bisa.
 *  - `/v1/model/list`        -> publik (katalog + harga). SELALU bisa.
 *  - `/v1/models`            -> OpenAI-compatible (harga per token). Butuh inference key.
 *  - `/v1/billing/costs`     -> butuh inference key + request IDs (inference-id).
 *  - `/v1/organizations/{org_id}/usage/balance` -> butuh SESSION TOKEN (JWT),
 *    BUKAN inference key. Dengan inference key saja -> 401. Lihat BalanceInfo.accessible.
 */

/** Umpan balik pembungkus: tiap fetch mengembalikan sukses/gagal + pesan + sumber. */
export interface Feedback<T> {
  ok: boolean;
  /** Data hasil, hanya ada bila ok. */
  data?: T;
  /** Pesan error apa adanya dari API (bukan ditelan), bila gagal. */
  error?: string;
  /** Endpoint sumber, untuk audit. */
  source: string;
  /** Latensi panggilan (ms). */
  latencyMs: number;
}

/** Respons `GET /v1/health` (publik). */
export interface HealthResponse {
  status: string; // "ok"
  version?: string | null;
}

/** Kesehatan layanan + model, hasil turunan untuk ditampilkan. */
export interface HealthStatus {
  /** Kesehatan layanan dari /v1/health. */
  service: "ok" | "degraded" | "down";
  version?: string | null;
  reachable: boolean;
  latencyMs: number;
  /** Model default yang dipakai Reader saat ini. */
  defaultModel: string;
  /** Apakah model default ada di katalog publik. */
  defaultModelListed: boolean;
  /**
   * Apakah model default benar-benar bisa dipanggil. Sinyal SEJATI kesehatan
   * model adalah "merespons saat dipanggil", bukan field `isReady` (lihat catatan
   * di bawah). Bila tidak diuji, nilai null.
   */
  defaultModelResponds?: boolean | null;
  /** Catatan: field `isReady` di katalog hanya passthrough OpenRouter dan TIDAK
   *  bisa dipercaya sebagai kesehatan (model yang jalan bisa tetap `isReady=false`). */
  note?: string;
}

/** Harga per token dalam USD (float; nano-USD dikonversi saat parsing). */
export interface ModelPricing {
  inputPerTokenUsd: number;
  outputPerTokenUsd: number;
  cacheReadPerTokenUsd?: number | null;
}

/** Satu entri model dari `/v1/model/list` (katalog publik + metadata). */
export interface ModelInfo {
  modelId: string;
  pricing: ModelPricing;
  contextLength?: number | null;
  maxOutputLength?: number | null;
  /** Passthrough OpenRouter — TIDAK diandalkan untuk kesehatan. */
  isReady?: boolean | null;
  attestationSupported?: boolean;
  verifiable?: boolean;
  ownedBy?: string;
  providerType?: string;
}

/** Ringkasan katalog model. */
export interface ModelCatalog {
  total: number;
  models: ModelInfo[];
}

/** Estimasi pemakaian token & biaya untuk satu panggilan (mis. 1x baca PDF). */
export interface TokenUsageEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Perkiraan biaya dalam USD. */
  estimatedCostUsd: number;
  /** Asumsi yang dipakai, supaya jujur angkanya perkiraan, bukan pasti. */
  assumptions: string;
}

/** Biaya nyata per request dari `/v1/billing/costs` (butuh inference-id). */
export interface RequestCost {
  requestId: string;
  costNanoUsd: number;
  costUsd: number;
}

/** Respons `/v1/organizations/{org_id}/usage/balance` (skema resmi). */
export interface OrganizationBalance {
  organization_id: string;
  total_spent: number; // nano-USD
  total_spent_display: string;
  total_requests: number;
  total_tokens: number;
  remaining?: number | null;
  remaining_display?: string | null;
  spend_limit?: number | null;
  spend_limit_display?: string | null;
  unfunded_amount: number;
  updated_at?: string;
}

/**
 * Sisa usage. `accessible=false` bila tidak bisa dibaca dengan kunci yang ada
 * (inference key ditolak 401; perlu session token JWT / reporting token).
 */
export interface BalanceInfo {
  accessible: boolean;
  balance?: OrganizationBalance;
  /** Alasan bila tidak accessible, apa adanya. */
  reason?: string;
}

/** Hasil gabungan yang jadi "umpan balik" utama untuk dashboard/CLI. */
export interface CloudStatus {
  checkedAt: string;
  health: HealthStatus;
  models: ModelCatalog;
  /** Perkiraan pemakaian token untuk 1x pembacaan PDF (bukan total akun). */
  estimatedRead: TokenUsageEstimate;
  /** Sisa usage akun. Sering `accessible=false` dengan inference key. */
  balance: BalanceInfo;
}
