import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { isPublicRoute, signInHref } from "../lib/access-policy.mjs";

test("only approved public routes are recognised; private and lookalike URLs stay closed", () => {
  for (const path of ["/", "/signin", "/verify", "/verify/"]) assert.equal(isPublicRoute(path), true, path);
  for (const path of ["/dashboard", "/federation", "/deals/new", "/verify-other", "/signin/extra", "//", "//example.com/", "/\\example.com"]) assert.equal(isPublicRoute(path), false, path);
});

test("sign-in links cannot carry an external or injected return destination", () => {
  assert.equal(signInHref("/dashboard"), "/signin?next=%2Fdashboard");
  assert.equal(signInHref("/deals/riverside-kingsport/resale"), "/signin?next=%2Fdeals%2Friverside-kingsport%2Fresale");
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/signin?next=https://example.com", "/dashboard\n", "/deals/../signin"]) assert.equal(signInHref(path), "/signin", path);
});

const exportRoot = new URL("../out/", import.meta.url);
test("closed route exports show the first-entry notice and no workspace data, including RSC payloads", { skip: !existsSync(new URL("index.html", exportRoot)) }, () => {
  const manifest = JSON.parse(readFileSync(new URL("../.next/prerender-manifest.json", import.meta.url), "utf8"));
  const routes = Object.keys(manifest.routes).filter(route => !route.startsWith("/_") && !isPublicRoute(route)).map(route => route.slice(1));
  for (const route of routes) {
    const html = readFileSync(new URL(route + ".html", exportRoot), "utf8");
    assert.ok(html.includes("Start at FULLBACK"), route);
    assert.ok(!html.includes("Riverside SC") && !html.includes("Kingsport FC") && !html.includes("R. Santos"), route + " leaked workspace HTML");
    const directory = new URL(route + "/", exportRoot);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".txt")) continue;
      const payload = readFileSync(new URL(entry.name, directory), "utf8");
      assert.ok(!payload.includes("Riverside SC") && !payload.includes("Kingsport FC") && !payload.includes("R. Santos"), route + " leaked an RSC payload");
    }
  }
});
