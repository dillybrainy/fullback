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

/** Model default pembaca (bisa dioverride via env). */
export function getModel(): string {
  return (
    env("LLM_MODEL") ??
    env("NEARAI_MODEL") ??
    "google/gemini-2.5-flash-lite"
  );
}

/** Nama env yang dipakai (untuk pesan error/diagnostik). */
export function describeConfig(): string {
  return `base=${getRawBaseUrl()} model=${getModel()} key=${getApiKey() ? "terisi" : "kosong"}`;
}
