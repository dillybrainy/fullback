/**
 * agent/usage/tracker.ts — Perekam pemakaian token NYATA per panggilan LLM.
 *
 * Latar: respons `/v1/chat/completions` mengembalikan `usage` (prompt/completion
 * tokens) dan header `inference-id`, tapi sebelumnya dibuang sehingga kita hanya
 * punya perkiraan. Modul ini merekam angka nyata itu secara sinkron (side-effect)
 * sehingga biaya per read bisa dihitung persis, bukan dikira-kira.
 *
 * Sengaja sinkron & tanpa I/O: `recordInference` dipanggil dari `llm.ts` tanpa
 * menambah latensi/kegagalan. Penghitungan biaya (yang butuh harga) dilakukan
 * terpisah di `usage/index.ts`.
 *
 * Tidak menyimpan teks prompt/maupun output — hanya angka token + id, sesuai
 * prinsip privasi NEAR AI Cloud (usage reporting tidak memuat isi teks).
 */

export interface InferenceRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** `inference-id` dari header respons — korelasi untuk `/v1/billing/costs`. */
  inferenceId?: string;
  at: string;
}

export interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Penyimpanan in-memory untuk satu proses (reset tiap run). */
const records: InferenceRecord[] = [];

/** Rekam satu panggilan LLM. Sinkron, tidak pernah melempar. */
export function recordInference(rec: {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inferenceId?: string;
}): void {
  const promptTokens = rec.promptTokens ?? 0;
  const completionTokens = rec.completionTokens ?? 0;
  records.push({
    model: rec.model,
    promptTokens,
    completionTokens,
    totalTokens: rec.totalTokens ?? promptTokens + completionTokens,
    inferenceId: rec.inferenceId,
    at: new Date().toISOString(),
  });
}

/** Semua catatan (salinan). */
export function getUsageRecords(): InferenceRecord[] {
  return [...records];
}

/** Catatan panggilan terakhir (untuk "biaya per read"). */
export function getLastUsage(): InferenceRecord | undefined {
  return records[records.length - 1];
}

/** Total kumulatif selama proses berjalan. */
export function getUsageTotals(): UsageTotals {
  return records.reduce<UsageTotals>(
    (acc, r) => ({
      calls: acc.calls + 1,
      promptTokens: acc.promptTokens + r.promptTokens,
      completionTokens: acc.completionTokens + r.completionTokens,
      totalTokens: acc.totalTokens + r.totalTokens,
    }),
    { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );
}

/** Kosongkan catatan (berguna untuk tes). */
export function resetUsage(): void {
  records.length = 0;
}
