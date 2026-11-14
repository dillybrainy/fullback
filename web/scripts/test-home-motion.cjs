// Exercises actual production output without starting a server.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, web, output, origin, offlineContext } = require("./offline-browser.cjs");
const screenshots = path.join(web, ".qa", "gsap");
const chunks = fs.readdirSync(path.join(output, "_next/static/chunks"));
const engine = chunks.filter(name => name.endsWith(".js") && fs.readFileSync(path.join(output, "_next/static/chunks", name), "utf8").includes("fullback-settle"));
assert.equal(engine.length, 1, "Expected one deferred Home motion chunk");
fs.mkdirSync(screenshots, { recursive: true });

async function checkGeometry(page, width) {
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    hero: document.querySelector(".hero").getBoundingClientRect().toJSON(),
    footer: document.querySelector(".home-footer").getBoundingClientRect().toJSON(),
    closing: getComputedStyle(document.querySelector(".closing-photo h2")).color,
    pin: document.querySelectorAll(".pin-spacer").length,
  }));
  assert.equal(geometry.overflow, false);
  for (const rect of [geometry.hero, geometry.footer]) { assert.equal(rect.x, 0); assert.equal(rect.width, width); }
  assert.equal(geometry.closing, "rgb(255, 255, 255)");
  assert.equal(geometry.pin, 0);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    for (const width of [1440, 390]) {
      const { context, errors, missing } = await offlineContext(browser, { viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(origin);
      await page.waitForFunction(() => !document.querySelector(".split-replay").hidden);
      await page.waitForFunction(() => !!document.querySelector(".hero-photo").style.transform);
      await page.waitForFunction(() => !document.querySelector(".hero-line>span").style.transform);
      await page.waitForFunction(() => !document.querySelector(".hero-photo").style.transform);
      await checkGeometry(page, width);
      await page.screenshot({ path: path.join(screenshots, "hero-" + width + ".png") });
      const values = await page.locator(".split-rows > div > dd:last-child").allTextContents();
      assert.deepEqual(values, ["16,000,000 fEUR", "3,000,000 fEUR", "800,000 fEUR", "200,000 fEUR"]);

      await page.locator(".transfer-steps").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => getComputedStyle(document.querySelector(".process-route")).display === "block");
      const track = await page.locator(".process-route").boundingBox();
      assert.ok(track.height > 200);
      // Scroll actually advances the marker; copy remains unmoved.
      const before = await page.locator(".process-route b").evaluate(el => el.getBoundingClientRect().top + scrollY);
      await page.locator(".transfer-steps li").last().evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .4, behavior: "instant" }));
      await page.waitForFunction(previous => {
        const marker = document.querySelector(".process-route b");
        return marker.getBoundingClientRect().top + scrollY > previous + 10;
      }, before);
      assert.equal(await page.locator(".transfer-steps p").first().evaluate(el => getComputedStyle(el).transform), "none");
      await page.locator(".how-it-works").screenshot({ path: path.join(screenshots, "process-" + width + ".png") });

      await page.locator(".split-panel").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll(".payment-routes circle")].some(el => +getComputedStyle(el).opacity > .2));
      await page.locator(".split-panel").screenshot({ path: path.join(screenshots, "payment-" + width + ".png") });
      await page.waitForFunction(() => [...document.querySelectorAll(".payment-routes circle")].every(el => +getComputedStyle(el).opacity === 0));
      await page.waitForFunction(() => document.querySelector(".split-replay").getAttribute("aria-disabled") === "false");
      const replay = page.getByRole("button", { name: "Replay example payment split" });
      await replay.focus();
      assert.equal(await replay.evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle !== "none"), true);
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => +getComputedStyle(document.querySelector(".payment-ball")).opacity > .2);
      await page.waitForFunction(() => [...document.querySelectorAll(".payment-routes circle")].every(el => +getComputedStyle(el).opacity === 0) && +getComputedStyle(document.querySelector(".payment-ball")).opacity === 0);
      assert.deepEqual(await page.locator(".split-rows > div > dd:last-child").allTextContents(), values);
      await page.waitForFunction(() => document.querySelector(".split-replay").getAttribute("aria-disabled") === "false");

      // Interrupt active playback, then re-enable without duplicate controllers.
      await page.keyboard.press("Space");
      await page.waitForFunction(() => +getComputedStyle(document.querySelector(".payment-ball")).opacity > .2);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => document.querySelector(".split-replay").hidden);
      assert.equal(await page.locator(".process-route").evaluate(el => getComputedStyle(el).display), "none");
      assert.equal(await page.locator(".hero-line>span").first().evaluate(el => getComputedStyle(el).transform), "none");
      assert.equal(await page.locator(".payment-routes circle").evaluateAll(nodes => nodes.every(el => +getComputedStyle(el).opacity === 0)), true);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(() => !document.querySelector(".split-replay").hidden);
      await page.setViewportSize({ width: width === 1440 ? 390 : 768, height: 900 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
      await replay.click();
      await page.waitForFunction(() => +getComputedStyle(document.querySelector(".payment-ball")).opacity === 0);
      await page.setViewportSize({ width: 320, height: 900 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);

      await page.evaluate(() => { window.previousHome = document.querySelector(".home"); });
      await page.locator(".hero .button").first().click();
      await page.waitForURL(origin + "/signin");
      await page.waitForFunction(() => !document.querySelector(".home"));
      assert.equal(await page.evaluate(() => window.previousHome.querySelector(".split-replay").hidden), true);
      assert.equal(await page.evaluate(() => window.previousHome.querySelector(".step-number").style.transform), "");
      await page.goBack();
      await page.waitForURL(origin + "/");
      await page.waitForFunction(() => !document.querySelector(".split-replay")?.hidden);
      assert.equal(await page.locator(".process-route").count(), 1);
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      await context.close();
      console.log("PASS hydrated production Home: hero, scroll process, four recipients, keyboard Replay, live reduced motion, resize, route cleanup at", width);
    }
    for (const settings of [{ reducedMotion: "reduce" }, { javaScriptEnabled: false }]) {
      const { context, requested, errors, missing } = await offlineContext(browser, settings);
      const page = await context.newPage();
      await page.goto(origin);
      assert.equal(await page.locator(".split-replay").isVisible(), false);
      assert.equal(await page.locator("h1").isVisible(), true);
      assert.equal(requested.some(url => engine.some(name => url.endsWith(name))), false);
      await checkGeometry(page, 1280);
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      await context.close();
      console.log("PASS static fallback; no GSAP download:", settings);
    }
    const { context, requested, errors, missing } = await offlineContext(browser);
    await context.addCookies([{ name: "fullback_landing_seen", value: "1", url: origin }]);
    const page = await context.newPage();
    await page.goto(origin + "/signin");
    assert.equal(requested.some(url => engine.some(name => url.endsWith(name))), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await context.close();
    console.log("PASS non-Home route after landing does not download GSAP");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
