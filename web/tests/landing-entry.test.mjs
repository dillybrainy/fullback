import test from "node:test";
import assert from "node:assert/strict";
import { unstable_getResponseFromNextConfig, getRedirectUrl } from "next/experimental/testing/server.js";
import { firstVisitRedirects, hasLandingCookie, LANDING_COOKIE } from "../lib/landing-entry.mjs";

const respond = (path, options = {}) => unstable_getResponseFromNextConfig({
  url: "https://fullback.test" + path,
  nextConfig: { redirects: firstVisitRedirects },
  headers: { accept: "text/html,application/xhtml+xml", ...options.headers },
  cookies: options.cookies,
});

test("a fresh document request to any page starts at Home, without a root loop", async () => {
  for (const path of ["/signin", "/verify", "/dashboard", "/deals/new", "/deals/riverside-kingsport/resale", "/federation", "/missing-page"]) {
    const response = await respond(path);
    assert.equal(response.status, 307, path);
    assert.equal(getRedirectUrl(response), "https://fullback.test/", path);
  }
  assert.equal(getRedirectUrl(await respond("/")), null);
});

test("after landing, normal page access is restored; an invalid marker does not count", async () => {
  assert.equal(getRedirectUrl(await respond("/verify", { cookies: { [LANDING_COOKIE]: "1" } })), null);
  assert.equal((await respond("/verify", { cookies: { [LANDING_COOKIE]: "0" } })).status, 307);
});

test("API, assets, HMR, prefetch, RSC, and actions are never redirected to Home", async () => {
  for (const path of ["/api", "/api/session", "/_next/hmr", "/_next/static/chunks/app.js", "/media/photo.webp", "/fonts/font.ttf", "/images/logo.svg", "/favicon.ico", "/robots.txt"]) assert.equal(getRedirectUrl(await respond(path)), null, path);
  for (const headers of [{ rsc: "1" }, { "next-router-prefetch": "1" }, { "next-action": "action-id" }, { accept: "application/json" }]) assert.equal(getRedirectUrl(await respond("/verify", { headers })), null);
});

test("the landing cookie is recognised by exact name and value only", () => {
  assert.equal(hasLandingCookie("other=1; " + LANDING_COOKIE + "=1"), true);
  for (const cookie of ["", LANDING_COOKIE + "=0", LANDING_COOKIE + "=10", "fake_" + LANDING_COOKIE + "=1"]) assert.equal(hasLandingCookie(cookie), false);
});
