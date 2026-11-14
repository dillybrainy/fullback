/**
 * agent/usage/index.ts — Datafetch untuk monitoring NEAR AI Cloud.
 *
 * Endpoint yang dipakai (semua sudah diverifikasi lewat tes langsung 14 Nov):
 *   GET /v1/health                              (publik)         -> kesehatan layanan
 *   GET /v1/model/list                          (publik)         -> katalog model + harga
 *   GET /v1/models                              (inference key)  -> harga per token (OpenAI)
 *   POST /v1/billing/costs                      (inference key)  -> biaya per request
 *   GET /v1/organizations/{org}/usage/balance   (session token)  -> sisa usage
 *
 * Semua fungsi mengembalikan `Feedback<T>` — tidak melempar exception, supaya
 * pemanggil selalu dapat umpan balik (sukses/gagal + pesan + sumber).
 */
import type {
  Feedback,
  HealthResponse,
  HealthStatus,
  ModelCatalog,
  ModelInfo,
  ModelPricing,
  OrganizationBalance,
  BalanceInfo,
  RequestCost,
  TokenUsageEstimate,
  CloudStatus,
} from "./types.js";
import { getUsageRecords, getUsageTotals, getLastUsage, type InferenceRecord } from "./tracker.js";
import { apiOrigin, getApiKey, getModel, getRawBaseUrl } from "../config.js";

const DEFAULT_MODEL = getModel();

/** nano-USD (skala 9) -> USD. */
const nanoToUsd = (n: number): number => n / 1e9;

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/** Pembungkus fetch standar: catat latensi, jangan lempar exception. */
async function call<T>(source: string, init: RequestInit): Promise<Feedback<T>> {
  const started = Date.now();
  try {
    // apiOrigin() ternormalisasi (tanpa /v1); `source` sudah menyertakan /v1,
    // jadi hasilnya konsisten `origin/v1/...` apa pun bentuk base URL di env.
    const res = await fetch(`${apiOrigin()}${source}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers ?? {}) },
    });
    const latencyMs = Date.now() - started;
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${text}`, source, latencyMs };
    }
    return { ok: true, data: JSON.parse(text) as T, source, latencyMs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), source, latencyMs: Date.now() - started };
  }
}

// ---------------------------------------------------------------------------
// 1. Kesehatan (health)
// ---------------------------------------------------------------------------

/** GET /v1/health — kesehatan layanan (publik, tanpa auth). */
export async function getHealth(): Promise<Feedback<HealthResponse>> {
  return call<HealthResponse>("/v1/health", { method: "GET" });
}

/**
 * Kesehatan layanan + model default dalam satu bentuk ringkas.
 * `defaultModelResponds` diisi bila `opts.probeModel` true (panggilan mini nyata);
 * tanpa itu, nilainya null — karena field `isReady` di katalog TIDAK bisa dipercaya.
 */
export async function getHealthStatus(opts?: { probeModel?: boolean }): Promise<Feedback<HealthStatus>> {
  const h = await getHealth();
  const catalog = await listModelsWithPricing();
  const listed = catalog.ok ? catalog.data!.models.some((m) => m.modelId === DEFAULT_MODEL) : false;

  let responds: boolean | null = null;
  if (opts?.probeModel) {
    const probe = await probeModelCompletion(DEFAULT_MODEL);
    responds = probe;
  }

  const status: HealthStatus = {
    service: h.ok && h.data?.status === "ok" ? "ok" : h.ok ? "degraded" : "down",
    version: h.data?.version ?? null,
    reachable: h.ok,
    latencyMs: h.latencyMs,
    defaultModel: DEFAULT_MODEL,
    defaultModelListed: listed,
    defaultModelResponds: responds,
    note: "Field katalog `isReady` hanya passthrough OpenRouter dan tidak andal; sinyal kesehatan model yang benar = merespons saat dipanggil.",
  };
  return { ok: h.ok, data: status, error: h.error, source: "/v1/health", latencyMs: h.latencyMs };
}

/** Panggilan mini untuk membuktikan model benar-benar merespons. true = sehat. */
async function probeModelCompletion(model: string): Promise<boolean | null> {
  const r = await call<{ choices?: unknown[] }>("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
  });
  return r.ok ? (Array.isArray(r.data?.choices) && r.data.choices.length > 0) : false;
}

// ---------------------------------------------------------------------------
// 2. Model + harga (dasar estimasi token)
// ---------------------------------------------------------------------------

/** GET /v1/model/list — katalog model + harga (publik). Harga dalam nano-USD. */
export async function listModelsWithPricing(): Promise<Feedback<ModelCatalog>> {
  const r = await call<{ models: RawModel[]; total: number }>("/v1/model/list", { method: "GET" });
  if (!r.ok) return { ok: false, error: r.error, source: r.source, latencyMs: r.latencyMs };
  const models: ModelInfo[] = (r.data?.models ?? []).map((m) => ({
    modelId: m.modelId,
    pricing: {
      inputPerTokenUsd: nanoToUsd(m.inputCostPerToken?.amount ?? 0),
      outputPerTokenUsd: nanoToUsd(m.outputCostPerToken?.amount ?? 0),
      cacheReadPerTokenUsd: m.cacheReadCostPerToken ? nanoToUsd(m.cacheReadCostPerToken.amount) : null,
    },
    contextLength: m.metadata?.contextLength ?? null,
    maxOutputLength: m.metadata?.maxOutputLength ?? null,
    isReady: m.metadata?.isReady ?? null,
    attestationSupported: m.metadata?.attestationSupported ?? false,
    verifiable: m.metadata?.verifiable ?? false,
    ownedBy: m.metadata?.ownedBy,
    providerType: m.metadata?.providerType,
  }));
  return { ok: true, data: { total: r.data?.total ?? models.length, models }, source: r.source, latencyMs: r.latencyMs };
}

// ---------------------------------------------------------------------------
// 3. Perkiraan pemakaian token & biaya
// ---------------------------------------------------------------------------

/**
 * Biaya NYATA dari pemakaian yang sudah direkam `llm.ts` (bukan perkiraan).
 * Token diambil dari field `usage` respons tiap panggilan, dikalikan harga model.
 * Biaya dihitung per model (bisa campur bila model berubah), lalu dijumlahkan.
 */
export async function getRealUsage(): Promise<
  Feedback<{ totals: ReturnType<typeof getUsageTotals>; totalCostUsd: number; lastReadCostUsd: number; records: InferenceRecord[] }>
> {
  const catalog = await listModelsWithPricing();
  const priceOf = (modelId: string): ModelPricing => {
    const m = catalog.ok ? catalog.data!.models.find((x) => x.modelId === modelId) : undefined;
    return m?.pricing ?? { inputPerTokenUsd: 0, outputPerTokenUsd: 0 };
  };
  const costOf = (r: InferenceRecord): number => {
    const p = priceOf(r.model);
    return r.promptTokens * p.inputPerTokenUsd + r.completionTokens * p.outputPerTokenUsd;
  };
  const records = getUsageRecords();
  const totalCostUsd = records.reduce((sum, r) => sum + costOf(r), 0);
  const last = getLastUsage();
  return {
    ok: true,
    data: {
      totals: getUsageTotals(),
      totalCostUsd,
      lastReadCostUsd: last ? costOf(last) : 0,
      records,
    },
    source: "tracker+/v1/model/list",
    latencyMs: catalog.latencyMs,
  };
}

/**
 * Estimasi biaya untuk 1x pembacaan PDF (1 panggilan Reader).
 * Angka token adalah PERKIRAAN berdasarkan ukuran tipikal, bukan hasil ukur pasti —
 * karena itu `assumptions` selalu diisi supaya jujur sifatnya.
 */
export async function estimateReadCost(inputTokens?: number, outputTokens?: number): Promise<Feedback<TokenUsageEstimate>> {
  const catalog = await listModelsWithPricing();
  const model = catalog.ok ? catalog.data!.models.find((m) => m.modelId === DEFAULT_MODEL) : undefined;

  // Asumsi tipikal 1x baca PDF perjanjian (bisa dioverride lewat argumen).
  const inTok = inputTokens ?? 4_500; // system prompt (skema JSON) + teks PDF
  const outTok = outputTokens ?? 700; // JSON hasil ekstraksi

  const inPrice = model?.pricing.inputPerTokenUsd ?? 0.0000001;
  const outPrice = model?.pricing.outputPerTokenUsd ?? 0.0000004;
  const cost = inTok * inPrice + outTok * outPrice;

  const estimate: TokenUsageEstimate = {
    model: DEFAULT_MODEL,
    inputTokens: inTok,
    outputTokens: outTok,
    totalTokens: inTok + outTok,
    estimatedCostUsd: cost,
    assumptions: `Perkiraan: input ${inTok} token (system prompt + teks PDF) + output ${outTok} token (JSON). Harga ${DEFAULT_MODEL}: $${inPrice}/token input, $${outPrice}/token output. Angka token adalah asumsi tipikal, bukan hasil ukur pasti per PDF.`,
  };
  return { ok: true, data: estimate, source: "/v1/model/list", latencyMs: catalog.latencyMs };
}

/** POST /v1/billing/costs — biaya nyata per request (butuh inference-id tiap panggilan). */
export async function getRequestCosts(requestIds: string[]): Promise<Feedback<RequestCost[]>> {
  const r = await call<{ requests: { requestId: string; costNanoUsd: number }[]; warning?: string }>(
    "/v1/billing/costs",
    { method: "POST", body: JSON.stringify({ requestIds }) },
  );
  if (!r.ok) return { ok: false, error: r.error, source: r.source, latencyMs: r.latencyMs };
  const costs: RequestCost[] = (r.data?.requests ?? []).map((x) => ({
    requestId: x.requestId,
    costNanoUsd: x.costNanoUsd,
    costUsd: nanoToUsd(x.costNanoUsd),
  }));
  return { ok: true, data: costs, source: r.source, latencyMs: r.latencyMs };
}

// ---------------------------------------------------------------------------
// 4. Sisa usage (balance) — sering tidak terakses dengan inference key
// ---------------------------------------------------------------------------

/**
 * GET /v1/organizations/{org_id}/usage/balance — sisa usage.
 * Endpoint ini butuh SESSION TOKEN (JWT), bukan inference key. Dengan inference
 * key saja API membalas 401. `accessible` menjelaskan hal itu apa adanya.
 */
export async function getBalance(orgId: string): Promise<Feedback<BalanceInfo>> {
  const r = await call<OrganizationBalance>(`/v1/organizations/${orgId}/usage/balance`, { method: "GET" });
  if (r.ok && r.data) {
    return { ok: true, data: { accessible: true, balance: r.data }, source: r.source, latencyMs: r.latencyMs };
  }
  return {
    ok: true,
    data: {
      accessible: false,
      reason:
        "Endpoint balance butuh session token (JWT) organisasi, bukan inference key. " +
        `Respons API: ${r.error}. Untuk melihat sisa usage, buat reporting token (rpt-...) ` +
        "atau pakai session token dari dashboard NEAR AI Cloud.",
    },
    source: "/v1/organizations/{org_id}/usage/balance",
    latencyMs: r.latencyMs,
  };
}

// ---------------------------------------------------------------------------
// 5. Agregat: satu panggilan untuk semua status (yang dipakai CLI/dashboard)
// ---------------------------------------------------------------------------

/** Ambil semua status sekaligus: health, model, estimasi token, sisa usage. */
export async function getCloudStatus(opts?: { orgId?: string; probeModel?: boolean }): Promise<CloudStatus> {
  const [health, estimate, balance] = await Promise.all([
    getHealthStatus({ probeModel: opts?.probeModel }),
    estimateReadCost(),
    getBalance(opts?.orgId ?? "me"),
  ]);
  const catalog = await listModelsWithPricing();
  return {
    checkedAt: new Date().toISOString(),
    health: health.data ?? {
      service: "down",
      reachable: false,
      latencyMs: 0,
      defaultModel: DEFAULT_MODEL,
      defaultModelListed: false,
    },
    models: catalog.data ?? { total: 0, models: [] },
    estimatedRead: estimate.data ?? {
      model: DEFAULT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      assumptions: "estimasi tidak tersedia",
    },
    balance: balance.data ?? { accessible: false, reason: "tidak dapat diambil" },
  };
}

// ---------------------------------------------------------------------------
// Bentuk mentah dari API (internal, untuk parsing)
// ---------------------------------------------------------------------------

interface RawModel {
  modelId: string;
  inputCostPerToken?: { amount: number };
  outputCostPerToken?: { amount: number };
  cacheReadCostPerToken?: { amount: number } | null;
  metadata?: {
    contextLength?: number;
    maxOutputLength?: number | null;
    isReady?: boolean | null;
    attestationSupported?: boolean;
    verifiable?: boolean;
    ownedBy?: string;
    providerType?: string;
  };
}
