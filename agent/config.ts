/**
 * agent/config.ts — Konfigurasi endpoint LLM (OpenAI-compatible) yang dipakai
 * bersama oleh `reader/llm.ts` (chat) dan `usage/index.ts` (monitoring NEAR).
 *
 * Kenapa file ini ada: sebelumnya dua modul menginterpretasikan
 * `NEARAI_API_BASE_URL` secara BERBEDA — `llm.ts` mengharapkan URL sudah
 * berakhiran `/v1` (lalu append `/chat/completions`), sedangkan `usage/index.ts`
 * mengharapkan TANPA `/v1` (lalu append `/v1/health`). Default-nya kebetulan
 * cocok masing-masing, tapi begitu base URL di-override (mis. untuk provider
 * non-NEAR), `usage/index.ts` menghasilkan URL dobel `/v1/.../v1/...`.
 *
 * Di sini URL dinormalisasi: `apiOrigin()` membuang `/v1` & slash akhir, sehingga
 * kedua modul konsisten APA PUN inputnya (dengan/tanpa `/v1`). Ini juga membuat
 * testing ke provider OpenAI-compatible lain (OpenAI, OpenRouter, lokal) lancar.
 *
 * Nama env: mendukung `LLM_*` (generik, untuk multi-provider) dengan fallback
 * ke `NEARAI_*` (nama lama) supaya kode/konfigurasi yang ada tidak rusak.
 * Yang dirahasiakan hanyalah API KEY — base URL dan model bukan rahasia.
 */

const DEFAULT_BASE_URL = "https://cloud-api.near.ai/v1";

/**
 * Nilai env yang sudah di-trim; string kosong dianggap TIDAK disetel.
 * Tanpa ini, baris kosong di .env (mis. `LLM_API_KEY=`) mematikan fallback
 * ke NEARAI_* karena `"" ?? x` menghasilkan `""`, bukan `x`.
 */
function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v === "" ? undefined : v;
}

/** Base URL mentah dari env (belum dinormalisasi). */
export function getRawBaseUrl(): string {
  return env("LLM_API_BASE_URL") ?? env("NEARAI_API_BASE_URL") ?? DEFAULT_BASE_URL;
}

/** Origin saja: tanpa `/v1` dan tanpa slash akhir. Contoh: `https://cloud-api.near.ai`. */
export function apiOrigin(baseUrl?: string): string {
  const base = (baseUrl ?? getRawBaseUrl()).trim();
  return base.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/** Base URL chat OpenAI-compatible (origin + `/v1`), untuk `/chat/completions`. */
export function chatBaseUrl(baseUrl?: string): string {
  return `${apiOrigin(baseUrl)}/v1`;
}

/** API key. HANYA dari env — tidak pernah di-hardcode. */
export function getApiKey(): string | undefined {
  return env("LLM_API_KEY") ?? env("NEARAI_API_KEY");
}

/**
 * Model default pembaca: Qwen3.6 35B, model PRIVATE di NEAR AI Cloud (jalan di
 * TEE Intel TDX + GPU NVIDIA, punya attestation). Dipilih 15 Nov lewat eval
 * 19 PDF tes + Deal 1 (lihat eval/README.md). Bisa dioverride via env.
 */
export const DEFAULT_MODEL = "Qwen/Qwen3.6-35B-A3B-FP8";

export function getModel(): string {
  return env("LLM_MODEL") ?? env("NEARAI_MODEL") ?? DEFAULT_MODEL;
}

/**
 * Field tambahan untuk body chat request.
 *
 * - Env `LLM_EXTRA_BODY` (JSON object) menang kalau disetel; `{}` mematikan default.
 * - Tanpa env: model Qwen3 mendapat `chat_template_kwargs.enable_thinking=false`.
 *   Dengan "thinking" menyala, Qwen3.6 butuh 10–90 dtk per PDF dan sering macet
 *   (timeout) pada PDF yang bertentangan dengan schema; tanpa thinking ±2 dtk
 *   dan lulus semua tes. JSON rusak → error jelas.
 */
export function getExtraBody(model: string = getModel()): Record<string, unknown> {
  const raw = env("LLM_EXTRA_BODY");
  if (!raw) {
    return /^qwen\/qwen3/i.test(model) ? { chat_template_kwargs: { enable_thinking: false } } : {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM_EXTRA_BODY must be a JSON object, e.g. {\"chat_template_kwargs\":{\"enable_thinking\":false}}");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("LLM_EXTRA_BODY must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Nama env yang dipakai (untuk pesan error/diagnostik). */
export function describeConfig(): string {
  return `base=${getRawBaseUrl()} model=${getModel()} key=${getApiKey() ? "terisi" : "kosong"}`;
}
