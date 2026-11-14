const assert = require("node:assert/strict");
const { chromium, origin, offlineContext } = require("./offline-browser.cjs");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    for (const path of ["/signin", "/verify", "/dashboard", "/deals/new", "/deals/riverside-kingsport/resale", "/federation", "/missing-page"]) {
      const { context, errors, missing } = await offlineContext(browser, { reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(origin + path);
      await page.waitForURL(origin + "/");
      await page.locator(".hero").waitFor();
      const cookie = (await context.cookies()).find(cookie => cookie.name === "fullback_landing_seen");
      assert.equal(cookie.value, "1");
      assert.equal(cookie.expires, -1, "Entry marker must last for this browser session only");
      await page.goto(origin + "/verify");
      await page.getByRole("heading", { name: "Is this the agreement both clubs signed?" }).waitFor();
      assert.equal(new URL(page.url()).pathname, "/verify");
      await page.reload();
      await page.getByRole("heading", { name: "Is this the agreement both clubs signed?" }).waitFor();
      await page.goto(origin + "/dashboard");
      await page.waitForURL(url => url.pathname === "/signin");
      await page.getByRole("heading", { name: "Sign in to FULLBACK" }).waitFor();
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      await context.close();
      console.log("PASS first entry → Home → public page/reload; private workspace still closed:", path);
    }

    // Cookie policies may prevent persistence: in-memory entry still permits
    // client navigation after Home, without trapping the visitor in a loop.
    const { context, errors } = await offlineContext(browser, { reducedMotion: "reduce" });
    await context.addInitScript(() => Object.defineProperty(document, "cookie", { get: () => "", set: () => {} }));
    const page = await context.newPage();
    await page.goto(origin);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Verify PDF" }).click();
    await page.waitForURL(origin + "/verify");
    await page.getByRole("heading", { name: "Is this the agreement both clubs signed?" }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();

    const noJs = await offlineContext(browser, { javaScriptEnabled: false });
    const noJsPage = await noJs.context.newPage();
    await noJsPage.goto(origin + "/verify");
    await noJsPage.waitForURL(origin + "/");
    assert.equal(await noJsPage.locator(".hero").count(), 1);
    await noJs.context.close();
    console.log("PASS cookie-disabled client navigation and no-JS first entry; no redirect loops");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
