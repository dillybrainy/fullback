/**
 * llm.ts — the AI Reader call to NEAR AI Cloud (OpenAI-compatible, KTD6).
 *
 * The model receives the raw PDF text and must answer with JSON matching
 * `ReaderLLMSchema`. The zod schema is converted to JSON Schema
 * (zod-to-json-schema) and embedded in the system prompt, so the prompt and
 * the validation can never drift apart.
 *
 * The model NEVER computes money logic: no bps, no smallest-unit conversion.
 * It only extracts what is written in the PDF. `enrich.ts` does the rest.
 */
import { zodToJsonSchema } from "zod-to-json-schema";
import { ReaderLLMSchema, type ReaderLLM } from "../schema.js";

const DEFAULT_BASE_URL = "https://cloud-api.near.ai/v1";
// Model is configurable via NEARAI_MODEL. The original default (the one in the
// NEAR AI Cloud docs, deepseek-ai/DeepSeek-V3.1) was removed from the catalogue
// (400 "Model not found"), so the Reader crashed on live PDFs until 14 Nov.
//
// DEFAULT_MODEL is chosen by measurement, not by size — see agent/eval/README.md.
// We require a model that (a) copies clause quotes VERBATIM (R14), (b) keeps
// every schema field, and (c) does so consistently across runs. Several "bigger"
// models failed: deepseek-v3.2 paraphrased quotes, gpt-5.4-mini dropped the
// collateral field, gpt-5.4-nano passed only 1 of 3 runs.
//
// google/gemini-2.5-flash-lite passed 3/3 runs on the deal1 sample (asserting the
// R2/R3 numbers + empty warnings[]) and is the cheapest/fastest tier tested.
// Override with NEARAI_MODEL to switch without a code change.
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

const JSON_SCHEMA = JSON.stringify(zodToJsonSchema(ReaderLLMSchema, { name: "AgreementTerms" }));

const SYSTEM_PROMPT = `You read football transfer agreements and extract their terms as JSON.

Return a single JSON object that validates against this JSON Schema:
${JSON_SCHEMA}

Rules:
- Every "quote" must be copied VERBATIM from the document text, character for
  character, including the amounts with their separators (e.g. "EUR 2,500,000").
  Never paraphrase or fix what the document says.
- "clause" is the number of the clause the quote comes from, e.g. "3.1", or
  "Annex A" for the player's registration history table.
- Amounts ("amount" fields) are whole EUR numbers without separators,
  e.g. 2500000. "currency" is the ISO 4217 code used in the document.
- Dates are ISO "YYYY-MM-DD". "dueDate" is the payment deadline written in the
  document, not a computed date.
- "sellOn.percent" is the percentage number exactly as written (15 means 15%).
  "sellOn.basis" is "gross" or "net" depending on what the document says.
- "trainingClubs" lists EVERY club in the player's registration history table
  (usually "Annex A"), including clubs that trained the player from age 24
  onwards. "ageFrom"/"ageTo" are the inclusive ages from that table; for a row
  like "24 onwards" use the player's current age as "ageTo". Never compute
  percentages or bps yourself.
- If the document has no security/collateral clause (e.g. a resale agreement
  between clubs), omit the "collateral" field entirely.
- Output ONLY the JSON object, nothing else.`;

export class ReaderValidationError extends Error {
  constructor(
    public readonly zodMessage: string,
    public readonly rawAnswer: string,
  ) {
    super(`The AI Reader returned an answer that does not match the schema: ${zodMessage}`);
    this.name = "ReaderValidationError";
  }
}

export class LlmApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`NEAR AI Cloud answered ${status}: ${body}`);
    this.name = "LlmApiError";
  }
}

/** Ask NEAR AI Cloud to read the agreement. Throws on API or schema errors. */
export async function readAgreementWithLlm(pdfText: string): Promise<ReaderLLM> {
  const apiKey = process.env.NEARAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEARAI_API_KEY is not set. Set it in .env, or run with DEMO_MODE=true to use the fixtures.",
    );
  }
  const baseUrl = process.env.NEARAI_API_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.NEARAI_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: pdfText },
      ],
    }),
  });

  if (!res.ok) {
    throw new LlmApiError(res.status, await res.text());
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NEAR AI Cloud returned no message content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ReaderValidationError("the answer is not valid JSON", content);
  }

  const result = ReaderLLMSchema.safeParse(parsed);
  if (!result.success) {
    throw new ReaderValidationError(
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      content,
    );
  }
  return result.data;
}
