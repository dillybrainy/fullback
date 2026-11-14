const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, web, origin, offlineContext } = require("./offline-browser.cjs");
const privateRoutes = ["/dashboard", "/deals/new", "/deals/riverside-kingsport", "/deals/riverside-kingsport/resale", "/federation"];
const screenshots = path.join(web, ".qa", "public-access");
fs.mkdirSync(screenshots, { recursive: true });

async function geometry(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator("img").evaluateAll(images => Promise.all(images.map(img => { img.loading = "eager"; return img.decode(); })));
  return page.evaluate(() => {
    const rect = document.querySelector("h1").getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      heading: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      font: getComputedStyle(document.body).fontFamily,
      loaded: [...document.fonts].some(font => font.family.toLowerCase().includes("schibsted") && !font.family.includes("Fallback") && font.status === "loaded"),
      images: [...document.images].filter(img => img.getBoundingClientRect().width && (!img.complete || !img.naturalWidth)).map(img => img.src),
    };
  });
}

(async () => {
  const baseline = new Map();
  const executables = [process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"];
  const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  if (fs.existsSync(edge)) executables.push(edge);
  for (const executablePath of executables) {
    const name = executablePath.includes("Edge") ? "Edge" : "Chrome";
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
      for (const deviceScaleFactor of name === "Chrome" ? [1, 2] : [1]) {
        const { context, errors, missing } = await offlineContext(browser, { reducedMotion: "reduce", deviceScaleFactor });
        const page = await context.newPage();
        for (const width of [320, 390, 700, 701, 768, 900, 1024, 1280, 1440, 1920, 2560]) {
          await page.setViewportSize({ width, height: 900 });
          for (const route of ["/", "/signin", "/verify"]) {
            await page.goto(origin + route);
            await page.waitForFunction(() => !document.getElementById("entry-title"));
            const result = await geometry(page);
            assert.equal(result.overflow, false, `${name} ${deviceScaleFactor}x ${width} ${route}: overflow`);
            assert.equal(result.loaded, true, "The bundled design font must actually load");
            assert.deepEqual(result.images, []);
            const key = width + route;
            if (name === "Chrome" && deviceScaleFactor === 1) baseline.set(key, result.heading);
            else for (const axis of ["x", "y", "width", "height"]) assert.ok(Math.abs(result.heading[axis] - baseline.get(key)[axis]) <= 1, `${name} ${deviceScaleFactor}x ${width} ${route}: different ${axis}`);
            if (name === "Chrome" && deviceScaleFactor === 1 && [390, 1440].includes(width)) await page.screenshot({ path: path.join(screenshots, route.replaceAll("/", "") + "-" + width + ".png"), fullPage: true });
          }
        }

        await context.addInitScript(() => {
          localStorage.setItem("fullback-session", JSON.stringify({ loggedIn: true, role: "Club" }));
          localStorage.setItem("isLoggedIn", "true");
        });
        await context.addCookies([{ name: "session", value: "fake-session", url: origin }]);
        for (const route of privateRoutes) {
          await page.goto(origin + route + "?role=academy&authenticated=true");
          await page.waitForURL(url => url.pathname === "/signin");
          assert.equal(new URL(page.url()).searchParams.get("next"), route);
          assert.equal(await page.getByRole("link", { name: /^Explore as/ }).count(), 0);
          await page.reload();
          assert.equal(new URL(page.url()).pathname, "/signin");
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(origin + "/verify");
        const toggle = page.getByRole("button", { name: "Open navigation" });
        await toggle.click();
        await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home", exact: true }).focus();
        await page.keyboard.press("Escape");
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
        await toggle.click();
        await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home", exact: true }).click();
        await page.waitForURL(origin + "/");
        await page.waitForFunction(() => document.querySelector(".hero"));
        assert.equal(await page.getByRole("button", { name: "Open navigation" }).getAttribute("aria-expanded"), "false");
        await page.goBack();
        await page.waitForURL(origin + "/verify");
        await page.goto(origin + "/signin?next=https://example.com");
        await page.getByRole("link", { name: "Back to Home", exact: true }).click();
        await page.waitForURL(origin + "/");
        const response = await page.goto(origin + "/missing-page");
        assert.equal(response.status(), 404);
        await page.getByRole("link", { name: "Back to Home", exact: true }).click();
        await page.waitForURL(origin + "/");
        assert.deepEqual(errors, []);
        assert.deepEqual(missing, []);
        await context.close();
        console.log(`PASS ${name} ${deviceScaleFactor}x: three public routes at 11 widths, design font, stable geometry, closed URLs, fake-session rejection, Home links, keyboard navigation, refresh/back/404`);
      }
      const { context, errors, missing } = await offlineContext(browser, { javaScriptEnabled: false });
      const page = await context.newPage();
      for (const route of privateRoutes) {
        await page.goto(origin + route);
        await page.waitForURL(origin + "/");
        assert.equal(await page.locator(".hero").count(), 1);
        assert.equal(await page.getByText("Riverside SC", { exact: true }).count(), 0);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      await context.close();
      console.log(`PASS ${name}: private contents stay unavailable with JavaScript disabled`);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
