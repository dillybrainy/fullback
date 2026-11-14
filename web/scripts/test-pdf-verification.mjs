import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createReaderHandler } from "../../agent/reader/http.ts";
const require = createRequire(import.meta.url);
const { chromium, offlineContext, origin, web } = require("./offline-browser.cjs");
const filePath = path.resolve(web, "../sample-agreements/tests/OK-01-basic.pdf");
const bytes = fs.readFileSync(filePath);
const hash = createHash("sha256").update(bytes).digest("hex");
const fixture = JSON.parse(fs.readFileSync(path.resolve(web, "../agent/fixtures/deal1.json"), "utf8"));
const deals = [0, 1, 2, 3].map(id => ({ deal_id: id, player_name: "Test player", seller_id: "seller.testnet", buyer_id: "buyer.testnet", pdf_hash: id === 0 ? hash : id === 2 ? "" : "b".repeat(64) }));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  for (const width of [390, 1440]) {
    let failRpc = false, configured = true, readerRequests = 0;
    const calls = [];
    const handleReader = createReaderHandler({ origins: [origin], configured: () => configured, mode: () => "live", read: async pdf => ({ pdfHash: createHash("sha256").update(pdf).digest("hex"), output: { ...fixture, warnings: [{ code: "installments_mismatch", field: "installments", message: "Review the installment total against the fee." }] } }) });
    const { context, errors, missing } = await offlineContext(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("https://test.rpc.fastnear.com/", async route => {
      const request = route.request().postDataJSON();
      assert.equal(request.method, "query");
      assert.equal(request.params.finality, "final");
      const args = JSON.parse(Buffer.from(request.params.args_base64, "base64").toString());
      calls.push({ method: request.params.method_name, args });
      if (failRpc) { failRpc = false; return route.fulfill({ status: 503, body: "Unavailable" }); }
      let value;
      if (request.params.method_name === "list_deals") value = deals;
      else if (request.params.method_name === "get_deal") value = args.deal_id === 3 ? null : deals[args.deal_id];
      else if (request.params.method_name === "verify_pdf_hash") value = args.pdf_hash === deals[args.deal_id].pdf_hash;
      else throw new Error("Unexpected contract method");
      await route.fulfill({ json: { result: { result: [...Buffer.from(JSON.stringify(value))], block_height: 123 } } });
    });
    await context.route(origin + "/api/reader", async route => {
      readerRequests++;
      const response = await handleReader(new Request(route.request().url(), {
        method: "POST", headers: route.request().headers(), body: route.request().postDataBuffer(),
      }));
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => document.cookie.includes("fullback_landing_seen=1"));
    await page.goto(origin + "/verify");
    await page.getByRole("heading", { name: "Is this the agreement both clubs signed?" }).waitFor();
    await page.getByLabel("Choose an agreement PDF").setInputFiles(filePath);
    await page.waitForFunction(expected => document.getElementById("sha256-result")?.value === expected, hash);
    const agreement = page.getByLabel("Agreement", { exact: true });
    await page.waitForFunction(() => document.querySelectorAll("#verification-agreement option").length === 5);
    assert.equal(readerRequests, 0, "Fingerprinting/NEAR comparison never uploads the PDF to AI");
    await agreement.selectOption("0");
    await page.getByText("PDF matches the recorded agreement", { exact: true }).waitFor();
    await agreement.selectOption("1");
    await page.getByText("PDF does not match this agreement", { exact: true }).waitFor();
    assert.equal(await page.getByText("PDF matches the recorded agreement", { exact: true }).count(), 0);
    await agreement.selectOption("2");
    await page.getByText("No PDF fingerprint recorded", { exact: true }).waitFor();
    await agreement.selectOption("3");
    await page.getByText("Agreement no longer found", { exact: true }).waitFor();
    failRpc = true;
    await agreement.selectOption("0");
    await page.getByRole("alert").filter({ hasText: "NEAR is unavailable" }).waitFor();
    await page.getByRole("button", { name: "Retry verification", exact: true }).click();
    await page.getByText("PDF matches the recorded agreement", { exact: true }).waitFor();
    configured = false;
    await page.getByRole("button", { name: "Review agreement with AI", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "AI review is not configured" }).waitFor();
    configured = true;
    const retry = page.getByRole("button", { name: "Retry AI review", exact: true });
    await retry.focus(); await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "AI review complete", exact: true }).waitFor();
    await page.getByText("Review the installment total against the fee.", { exact: false }).waitFor();
    const clause = page.locator(".reader-source").first();
    await clause.locator("summary").click();
    assert.equal(await clause.locator("blockquote").textContent(), fixture.player.quote);
    assert.equal(readerRequests, 2);
    assert.ok(calls.every(call => Object.keys(call.args).every(key => ["deal_id", "pdf_hash", "from_index", "limit"].includes(key))));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    const screenshots = path.join(web, ".qa/verify"); fs.mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, "verified-ai-" + width + ".png"), fullPage: true });
    await page.getByLabel("Choose an agreement PDF").setInputFiles({ name: "changed.pdf", mimeType: "application/pdf", buffer: Buffer.concat([bytes, Buffer.from("\nchanged")]) });
    await page.waitForFunction(oldHash => document.getElementById("sha256-result")?.value && document.getElementById("sha256-result").value !== oldHash, hash);
    assert.equal(await page.getByText("PDF matches the recorded agreement", { exact: true }).count(), 0, "New PDFs clear earlier verification");
    assert.equal(await page.getByRole("heading", { name: "AI review complete", exact: true }).count(), 0, "New PDFs clear earlier AI output");
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    await context.close();
    console.log("PASS PDF flow: exact bytes, chain match/mismatch/missing hash/missing deal, RPC retry, explicit AI consent, backend configuration error, warnings/quotes, file reset, keyboard and layout:", width);
  }
} finally { await browser.close(); }
