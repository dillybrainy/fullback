import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReaderHandler, MAX_READER_BYTES } from "../reader/http.js";
import type { ReaderOutput } from "../schema.js";
import type { ReadPdfResult } from "../reader/index.js";
const output = JSON.parse(readFileSync(new URL("../fixtures/deal1.json", import.meta.url), "utf8")) as ReaderOutput;
const ok01 = (JSON.parse(readFileSync(new URL("../fixtures/ok01-basic.json", import.meta.url), "utf8")) as { output: ReaderOutput }).output;
const bytes = Buffer.from("%PDF-1.7\ntransport fixture");
const result = { output, pdfHash: createHash("sha256").update(bytes).digest("hex") };
const origin = "http://localhost:3000";
const request = (body: Uint8Array = bytes, extra: Record<string, string> = {}) => new Request("http://reader.local/api/reader", { method: "POST", headers: { Origin: origin, "Content-Type": "application/pdf", ...extra }, body: new Uint8Array(body) });
afterEach(() => vi.unstubAllEnvs());

describe("Reader HTTP boundary", () => {
  it("runs the existing real Reader on an exact demo PDF without network or credentials", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    // Demo PDF = tests/OK-01-basic.pdf; read the committed LF blob from git so
    // the hash matches the fixture key regardless of checkout line endings.
    const pdf = execFileSync("git", ["cat-file", "blob", "HEAD:sample-agreements/tests/OK-01-basic.pdf"]);
    const response = await createReaderHandler()(request(pdf));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mode).toBe("demo"); expect(data.pdfHash).toBe(createHash("sha256").update(pdf).digest("hex"));
    expect(data.output.player.name).toBe(ok01.player.name);
  });
  it("reports missing configuration instead of sending an unconfigured paid request", async () => {
    const read = vi.fn();
    const response = await createReaderHandler({ configured: () => false, read })(request());
    expect(response.status).toBe(503); expect(read).not.toHaveBeenCalled();
  });
  it("rejects unauthorized origins, non-PDF data, empty and oversized requests before inference", async () => {
    const read = vi.fn(); const handle = createReaderHandler({ configured: () => true, read });
    expect((await handle(request(bytes, { Origin: "https://other.invalid" }))).status).toBe(403);
    expect((await handle(request(bytes, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await handle(request(Buffer.from("not a pdf")))).status).toBe(415);
    expect((await handle(request(Buffer.alloc(0)))).status).toBe(400);
    expect((await handle(request(bytes, { "Content-Length": String(MAX_READER_BYTES + 1) }))).status).toBe(413);
    expect(read).not.toHaveBeenCalled();
  });
  it("preserves warnings, bounds inference and enforces the review budget", async () => {
    const read = vi.fn().mockResolvedValue({ ...result, output: { ...output, warnings: [{ code: "installments_mismatch", field: "installments", message: "Installments do not total the fee." }] } });
    const handle = createReaderHandler({ read, configured: () => true, maxPerClient: 1 });
    const response = await handle(request(), "peer");
    expect(response.status).toBe(200); expect((await response.json()).output.warnings).toHaveLength(1);
    expect(read.mock.calls[0][1]).toMatchObject({ maxPages: 50, maxTextChars: 60000 });
    expect((await handle(request(), "peer")).status).toBe(429);
  });
  it("cancels timed-out inference and returns no provider secrets or raw model response", async () => {
    const timed = createReaderHandler({ configured: () => true, timeoutMs: 5, read: vi.fn((_bytes, options) => new Promise<ReadPdfResult>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(options.signal?.reason)))) });
    expect((await timed(request())).status).toBe(504);
    const handle = createReaderHandler({ configured: () => true, read: vi.fn().mockRejectedValue(new Error("Provider key SECRET_TOKEN: full raw response")) });
    const response = await handle(request());
    expect(response.status).toBe(422); expect(await response.text()).not.toContain("SECRET_TOKEN");
  });
  it("refuses a review whose fingerprint differs from the submitted PDF", async () => {
    const handle = createReaderHandler({ configured: () => true, read: vi.fn().mockResolvedValue({ ...result, pdfHash: "f".repeat(64) }) });
    expect((await handle(request())).status).toBe(422);
  });
});
