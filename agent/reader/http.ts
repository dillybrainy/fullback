import { readPdf } from "./index.js";
import { ReaderOutputSchema } from "../schema.js";
import { getApiKey } from "../config.js";
import { createHash } from "node:crypto";

export const MAX_READER_BYTES = 20 * 1024 * 1024;
type Options = {
  read?: typeof readPdf;
  origins?: string[];
  configured?: () => boolean;
  mode?: () => "demo" | "live";
  timeoutMs?: number;
  maxPerHour?: number;
  maxPerClient?: number;
};

/** A bounded read-only HTTP adapter. No wallet signing or contract writes. */
export function createReaderHandler(options: Options = {}) {
  const read = options.read ?? readPdf;
  const mode = options.mode ?? (() => process.env.DEMO_MODE === "true" ? "demo" : "live");
  const configured = options.configured ?? (() => mode() === "demo" || Boolean(getApiKey()?.trim()));
  const origins = options.origins ?? (process.env.READER_ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000").split(",").map(s => s.trim()).filter(Boolean);
  let active = false;
  let windowStart = Date.now();
  let total = 0;
  const clients = new Map<string, number>();
  return async (request: Request, clientId = "local"): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const allowed = Boolean(origin && origins.includes(origin));
    const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" };
    if (allowed) headers["Access-Control-Allow-Origin"] = origin!;
    const json = (status: number, data: object) => new Response(JSON.stringify(data), { status, headers });
    if (new URL(request.url).pathname !== "/api/reader") return json(404, { error: "Not found." });
    if (!allowed) return json(403, { error: "This website is not allowed to use the AI Reader." });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    if (request.method === "GET") return json(200, { configured: configured(), mode: mode(), maxBytes: MAX_READER_BYTES });
    if (request.method !== "POST") return json(405, { error: "Use POST to review a PDF." });
    if (!configured()) return json(503, { error: "AI review is not configured on this deployment." });
    if (request.headers.get("Content-Type")?.split(";")[0] !== "application/pdf") return json(415, { error: "Choose a PDF agreement." });
    if (Number(request.headers.get("Content-Length")) > MAX_READER_BYTES) return json(413, { error: "This PDF is larger than 20 MB." });
    if (active) return json(429, { error: "Another agreement is being reviewed. Please retry shortly." });
    if (Date.now() - windowStart >= 3600000) { windowStart = Date.now(); total = 0; clients.clear(); }
    if (total >= (options.maxPerHour ?? 50) || (clients.get(clientId) ?? 0) >= (options.maxPerClient ?? 10)) return json(429, { error: "The AI review limit has been reached. Please try again later." });
    active = true;
    const controller = new AbortController();
    const cancel = () => controller.abort(request.signal.reason);
    request.signal.addEventListener("abort", cancel, { once: true });
    if (request.signal.aborted) cancel();
    const timer = setTimeout(() => controller.abort(new DOMException("AI review timed out. Please retry.", "TimeoutError")), options.timeoutMs ?? 60000);
    try {
      const bytes = new Uint8Array(await request.arrayBuffer());
      controller.signal.throwIfAborted();
      if (!bytes.length || bytes.length > MAX_READER_BYTES) return json(bytes.length ? 413 : 400, { error: bytes.length ? "This PDF is larger than 20 MB." : "This PDF is empty." });
      if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes("%PDF-")) return json(415, { error: "This file does not contain a PDF document." });
      total++;
      clients.set(clientId, (clients.get(clientId) ?? 0) + 1);
      const result = await read(bytes, { signal: controller.signal, maxPages: 50, maxTextChars: 60000 });
      controller.signal.throwIfAborted();
      if (result.pdfHash !== createHash("sha256").update(bytes).digest("hex")) throw new Error("The reviewed PDF fingerprint does not match the submitted file.");
      const output = ReaderOutputSchema.parse(result.output);
      return json(200, { pdfHash: result.pdfHash, output, mode: mode() });
    } catch (error) {
      if (controller.signal.aborted) return json(504, { error: "AI review timed out or was cancelled. Please retry." });
      const message = error instanceof Error ? error.message : "";
      const safe = /^(This PDF|This file|DEMO_MODE is on|Unknown training club)/.test(message);
      return json(422, { error: safe ? message : "The AI Reader could not validate this agreement. Check that the PDF contains readable, complete transfer terms and retry." });
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", cancel);
      active = false;
    }
  };
}
