import test from "node:test";
import assert from "node:assert/strict";
import { listAgreements, verifyAgreement } from "../lib/contract-verification.mjs";
import { callView } from "../lib/near-rpc.mjs";
const hash = "a".repeat(64);
const deal = { deal_id: 0, player_name: "A player", seller_id: "seller.testnet", buyer_id: "buyer.testnet", pdf_hash: hash };

test("verification checks the selected agreement and sends only its ID and fingerprint", async () => {
  const calls = [];
  const read = async (method, args) => { calls.push([method, args]); return method === "get_deal" ? deal : true; };
  assert.equal((await verifyAgreement({ read, dealId: 0, pdfHash: hash })).status, "verified");
  assert.deepEqual(calls, [["get_deal", { deal_id: 0 }], ["verify_pdf_hash", { deal_id: 0, pdf_hash: hash }]]);
});
test("mismatched, missing, and unregistered PDFs never report verified", async () => {
  assert.equal((await verifyAgreement({ read: async method => method === "get_deal" ? deal : false, dealId: 0, pdfHash: "b".repeat(64) })).status, "mismatch");
  assert.equal((await verifyAgreement({ read: async () => null, dealId: 0, pdfHash: hash })).status, "not-found");
  assert.equal((await verifyAgreement({ read: async () => ({ ...deal, pdf_hash: "" }), dealId: 0, pdfHash: hash })).status, "unregistered");
});
test("malformed IDs, hashes, other agreements, and inconsistent responses are rejected", async () => {
  for (const id of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(verifyAgreement({ read: async () => deal, dealId: id, pdfHash: hash }));
  await assert.rejects(verifyAgreement({ read: async () => deal, dealId: 0, pdfHash: "invalid" }));
  await assert.rejects(verifyAgreement({ read: async () => ({ ...deal, deal_id: 1 }), dealId: 0, pdfHash: hash }), /different agreement/);
  await assert.rejects(verifyAgreement({ read: async method => method === "get_deal" ? deal : "true", dealId: 0, pdfHash: hash }), /inconsistent/);
  await assert.rejects(verifyAgreement({ read: async method => method === "get_deal" ? deal : true, dealId: 0, pdfHash: "b".repeat(64) }), /inconsistent/);
});
test("agreement paging requests bounded pages rather than loading an unlimited history", async () => {
  let args;
  const response = await listAgreements(async (_method, input) => { args = input; return Array.from({ length: 50 }, (_, i) => ({ ...deal, deal_id: i + 50 })); }, 50);
  assert.deepEqual(args, { from_index: 50, limit: 50 });
  assert.equal(response.nextIndex, 100); assert.equal(response.hasMore, true);
  await assert.rejects(listAgreements(async () => [{}]), /invalid agreement/);
});
const rpcOptions = { rpcUrl: "https://rpc.invalid", contractId: "contract.testnet", method: "get_deal", args: { deal_id: 0 } };
test("RPC uses finalized read-only contract calls and decodes the byte result", async () => {
  const result = await callView({ ...rpcOptions, fetchImpl: async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.method, "query"); assert.equal(body.params.finality, "final");
    assert.equal(Buffer.from(body.params.args_base64, "base64").toString(), '{"deal_id":0}');
    return Response.json({ result: { result: [...Buffer.from(JSON.stringify(deal))] } });
  } });
  assert.deepEqual(result, deal);
});
test("RPC HTTP, contract, malformed response and timeout failures stay errors", async () => {
  for (const response of [new Response("Unavailable", { status: 503 }), Response.json({ error: { message: "missing" } }), Response.json({ result: { result: "invalid" } })]) {
    await assert.rejects(callView({ ...rpcOptions, fetchImpl: async () => response }));
  }
  await assert.rejects(callView({ ...rpcOptions, timeoutMs: 5, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))) }), /timed out/);
});
