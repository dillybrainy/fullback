import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import helpers from "../scripts/static-export-paths.cjs";

test("Windows-style nested segment payloads get the exact dotted URLs requested by the router", () => {
  const root = mkdtempSync(join(tmpdir(), "fullback-export-"));
  try {
    const nested = join(root, "signin", "__next.signin");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "__PAGE__.txt"), "original-rsc-payload");
    writeFileSync(join(root, "signin", "__next._tree.txt"), "tree-payload");
    writeFileSync(join(nested, "unchanged.html"), "html");
    assert.equal(helpers.normalizeExportPaths(root), 1);
    assert.equal(readFileSync(join(root, "signin", "__next.signin.__PAGE__.txt"), "utf8"), "original-rsc-payload");
    assert.equal(readFileSync(join(root, "signin", "__next._tree.txt"), "utf8"), "tree-payload");
    assert.equal(readFileSync(join(nested, "unchanged.html"), "utf8"), "html");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
