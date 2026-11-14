import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("checked-out test PDFs retain their recorded byte fingerprints on every OS", () => {
  const root = new URL("../../sample-agreements/tests/", import.meta.url);
  for (const fixture of JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"))) {
    const bytes = readFileSync(new URL(fixture.file, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.sha256, fixture.file);
  }
});
