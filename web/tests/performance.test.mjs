import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";

const photos = JSON.parse(readFileSync(new URL("../lib/photos.json", import.meta.url), "utf8"));
test("every responsive image variant exists, has the declared size and a content hash", () => {
  for (const photo of Object.values(photos)) {
    assert.ok(photo.variants.length >= 2);
    let lastWidth = 0;
    for (const variant of photo.variants) {
      const bytes = readFileSync(new URL("../public" + variant.src, import.meta.url));
      assert.equal(bytes.length, variant.bytes);
      assert.ok(variant.width > lastWidth && variant.width <= photo.width);
      assert.ok(variant.src.includes(createHash("sha256").update(bytes).digest("hex").slice(0, 12)));
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      lastWidth = variant.width;
    }
  }
});
test("public raster assets stay within a 1.5 MB budget across all variants", () => {
  const total = Object.values(photos).flatMap(photo => photo.variants).reduce((sum, item) => sum + item.bytes, 0);
  assert.ok(total < 1_500_000, "Responsive raster assets exceed budget: " + total);
});
test("mobile hero has a small source and original PNGs are not publicly served", () => {
  assert.ok(photos.imgHero.variants[0].bytes < 30_000);
  assert.equal(existsSync(new URL("../public/images/imgHero.png", import.meta.url)), false);
});
test("production pages have a prerendered artifact after a build", { skip: !existsSync(new URL("../.next/prerender-manifest.json", import.meta.url)) }, () => {
  const manifest = JSON.parse(readFileSync(new URL("../.next/prerender-manifest.json", import.meta.url), "utf8"));
  for (const route of ["/", "/dashboard", "/signin", "/verify", "/federation", "/deals/new", "/deals/riverside-kingsport", "/deals/riverside-kingsport/resale"]) {
    assert.ok(manifest.routes[route], "Request-time rendering returned for " + route);
    assert.equal(manifest.routes[route].initialRevalidateSeconds, false);
  }
});
