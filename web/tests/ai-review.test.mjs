import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requestAiReview } from "../lib/ai-review.mjs";
const output = JSON.parse(readFileSync(new URL("../../agent/fixtures/deal1.json", import.meta.url), "utf8"));
const file = new File(["%PDF-test"], "agreement.pdf");
const pdfHash = "a".repeat(64);
test("AI review uploads only when requested and accepts validated results for the same bytes", async () => {
  const result = await requestAiReview({ file, pdfHash, fetchImpl: async (_url, init) => {
    assert.equal(init.body, file); assert.equal(init.headers["Content-Type"], "application/pdf");
    return Response.json({ output, pdfHash, mode: "live" });
  } });
  assert.equal(result.output.player.name, output.player.name);
});
test("AI review rejects other-file results, incomplete output, HTML errors and unavailable service", async () => {
  const responses = [Response.json({ output, pdfHash: "b".repeat(64), mode: "live" }), Response.json({ output: {}, pdfHash, mode: "live" }), new Response("HTML"), Response.json({ error: "AI review is not configured on this deployment." }, { status: 503 })];
  for (const response of responses) await assert.rejects(requestAiReview({ file, pdfHash, fetchImpl: async () => response }));
});
