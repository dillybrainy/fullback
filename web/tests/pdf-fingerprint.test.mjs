import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createPdfFingerprint, MAX_PDF_SIZE } from "../lib/pdf-fingerprint.mjs";

test("SHA-256 matches the published abc test vector", async () => {
  const result = await createPdfFingerprint(new File(["abc"], "agreement.pdf"));
  assert.equal(result, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("hashes raw binary bytes and ignores the filename", async () => {
  const bytes = Buffer.from([37, 80, 68, 70, 45, 49, 46, 55, 10, 0, 128, 255]);
  const expected = createHash("sha256").update(bytes).digest("hex");
  assert.equal(await createPdfFingerprint(new File([bytes], "agreement.pdf")), expected);
  assert.equal(await createPdfFingerprint(new File([bytes], "renamed.PDF")), expected);
  const changed = Buffer.from(bytes);
  changed[changed.length - 1] = 254;
  assert.notEqual(await createPdfFingerprint(new File([changed], "agreement.pdf")), expected);
});

test("rejects empty files and non-PDF extensions", async () => {
  await assert.rejects(createPdfFingerprint(new File([], "empty.pdf")), /empty/);
  await assert.rejects(createPdfFingerprint(new File(["abc"], "agreement.txt")), /\.pdf extension/);
});

test("accepts a PDF exactly at the 20 MiB upload limit", async () => {
  const bytes = new Uint8Array(MAX_PDF_SIZE);
  const result = await createPdfFingerprint(new File([bytes], "limit.pdf"));
  assert.equal(result, createHash("sha256").update(bytes).digest("hex"));
});

test("rejects oversized PDFs before reading their bytes", async () => {
  let read = false;
  const oversized = {
    name: "oversized.pdf",
    size: MAX_PDF_SIZE + 1,
    async arrayBuffer() { read = true; throw new Error("Must not read oversized files"); },
  };
  await assert.rejects(createPdfFingerprint(oversized), /larger than 20 MB/);
  assert.equal(read, false);
});

test("reports unavailable Web Crypto instead of producing an unverified hash", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  try {
    await assert.rejects(createPdfFingerprint(new File(["abc"], "agreement.pdf")), /HTTPS or localhost/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else delete globalThis.crypto;
  }
});

test("propagates file-read errors without returning a hash", async () => {
  const error = new Error("File is no longer readable");
  const unreadable = { name: "unreadable.pdf", size: 1, async arrayBuffer() { throw error; } };
  await assert.rejects(createPdfFingerprint(unreadable), error);
});

test("does not trust MIME type as proof that the extension is PDF", async () => {
  await assert.rejects(createPdfFingerprint(new File(["abc"], "agreement.txt", { type: "application/pdf" })), /\.pdf extension/);
  const hash = await createPdfFingerprint(new File(["abc"], "agreement.PDF", { type: "" }));
  assert.equal(hash, createHash("sha256").update("abc").digest("hex"));
});
