const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, offlineContext, origin, web } = require("./offline-browser.cjs");

async function clickSection(page, width, label, id) {
  if (width <= 1100) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator(".navigation-panel").getByRole("link", { name: label, exact: true }).click();
    await page.locator(".navigation-panel").waitFor({ state: "hidden" });
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: label, exact: true }).click();
  }
  await page.waitForURL(origin + "/#" + id);
  await page.evaluate(() => { window.navbarAlignedAt = 0; });
  try {
    await page.waitForFunction(id => {
      const title = document.getElementById(id);
      const navbar = document.querySelector("header");
      const aligned = title?.tagName === "H2" && Math.abs(title.getBoundingClientRect().top - navbar.getBoundingClientRect().bottom - 16) < 2;
      if (!aligned) { window.navbarAlignedAt = 0; return false; }
      window.navbarAlignedAt ||= performance.now();
      // Verify the settled destination, including deferred layout refreshes.
      return performance.now() - window.navbarAlignedAt >= 300;
    }, id, { timeout: 5000 });
  } catch {
    throw new Error(JSON.stringify(await page.evaluate(id => ({ id, width: innerWidth, top: document.getElementById(id)?.getBoundingClientRect().top, navbarBottom: document.querySelector("header").getBoundingClientRect().bottom, scrollY, maxScroll: document.documentElement.scrollHeight - innerHeight, focus: document.activeElement?.tagName }), id)));
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const { context, errors, missing } = await offlineContext(browser);
    const page = await context.newPage();
    const screenshots = path.join(web, ".qa", "navbar");
    fs.mkdirSync(screenshots, { recursive: true });
    for (const width of [320, 390, 768, 1100, 1101, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches || !document.querySelector(".split-replay").hidden);
      await page.waitForFunction(() => !document.querySelector(".hero-photo").style.transform);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const header = await page.locator("header").boundingBox();
      assert.ok(header.x >= 12 && header.width <= 1280);
      const actions = page.locator(".hero .actions").getByRole("link");
      assert.equal(await actions.count(), 2);
      for (const action of await actions.all()) assert.ok((await action.boundingBox()).height >= 48);
      if (width <= 1100) {
        const trigger = page.getByRole("button", { name: "Open navigation" });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const popup = page.locator(".navigation-panel");
        await popup.waitFor();
        assert.equal(await popup.getAttribute("data-instant"), "true");
        const box = await popup.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
        assert.equal(await popup.evaluate(el => getComputedStyle(el).transitionDuration), "0s");
        await popup.getByRole("link", { name: "For clubs", exact: true }).focus();
        await page.keyboard.press("Escape");
        await popup.waitFor({ state: "hidden" });
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
        await trigger.click();
        await popup.waitFor();
        await page.screenshot({ path: path.join(screenshots, "menu-" + width + ".png") });
        await page.mouse.click(2, 2);
        await popup.waitFor({ state: "hidden" });
        await trigger.click();
        await popup.getByRole("link", { name: "For clubs", exact: true }).click();
        await page.waitForURL(origin + "/#for-clubs");
        await popup.waitFor({ state: "hidden" });
        await trigger.click();
        assert.equal(await popup.getByRole("link", { name: "For clubs", exact: true }).getAttribute("aria-current"), "page");
        await page.setViewportSize({ width: 1440, height: 900 });
        await popup.waitFor({ state: "hidden" });
      } else {
        const navigation = page.getByRole("navigation", { name: "Main navigation" });
        await navigation.getByRole("link", { name: "FAQ", exact: true }).click();
        await page.waitForURL(origin + "/#faq");
        await page.waitForFunction(() => document.querySelector('a[href="/#faq"]').hasAttribute("data-active"));
        await page.waitForFunction(() => Math.abs(document.getElementById("faq").getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom - 16) < 2);
        const heading = await page.locator("#faq").boundingBox();
        assert.ok(heading.y >= header.y + header.height, "Fixed header must not cover anchor content");
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('[data-slot="navigation-menu-link"]').hasAttribute("data-active"));
      }
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.screenshot({ path: path.join(screenshots, "home-" + width + ".png") });
      for (const [label, id] of [["How it works", "how-it-works"], ["For clubs", "for-clubs"], ["FAQ", "faq"]]) {
        await clickSection(page, width, label, id);
      }
      await page.goto(origin + "/verify");
      await page.getByRole("heading", { name: "Is this the agreement both clubs signed?" }).waitFor();
      await clickSection(page, width, "How it works", "how-it-works");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(() => !document.querySelector(".split-replay").hidden);
      for (const [label, id] of [["FAQ", "faq"], ["For clubs", "for-clubs"], ["How it works", "how-it-works"]]) {
        await clickSection(page, width, label, id);
      }
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(screenshots, "heading-" + width + ".png") });
      console.log("PASS navbar touch targets, keyboard/no-keyboard-motion, outside click, active hash, resize cleanup, anchors:", width);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
