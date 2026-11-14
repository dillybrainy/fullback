import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}

test("export asset references match actual filenames exactly, including case on Windows", { skip: !existsSync(root) }, () => {
  const exported = files(root);
  const names = new Set(exported.map(file => "/" + relative(root, file).split(sep).join("/")));
  for (const file of exported.filter(file => file.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    for (const [, attribute] of html.matchAll(/(?:src|href|srcset)="([^"]+)"/gi)) {
      for (const part of attribute.split(",")) {
        const url = part.trim().split(/\s/)[0].split("?")[0];
        if (/^\/(?:media|images|fonts|_next\/static)\//.test(url)) assert.ok(names.has(url), `${relative(root, file)} references a missing or differently cased asset: ${url}`);
      }
    }
  }
});

test("all public pages preload the three bundled design font weights", { skip: !existsSync(root) }, () => {
  for (const page of ["index", "signin", "verify"]) {
    const html = readFileSync(join(root, page + ".html"), "utf8");
    const fonts = [...html.matchAll(/<link\b[^>]*as="font"[^>]*>/g)].map(([link]) => link);
    assert.equal(fonts.length, 3, page + " must preload all design weights");
    for (const font of fonts) assert.match(font, /href="\/_next\/static\/media\/[^"/]+\.(?:ttf|woff2)"/);
  }
});
