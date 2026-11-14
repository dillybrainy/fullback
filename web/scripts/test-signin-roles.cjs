const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { parse } = require("acorn");
const { chromium, offlineContext, origin, output, web } = require("./offline-browser.cjs");

// Replace only the SDK boundary in intercepted browser assets. The production
// wallet provider, sign-in form, hydration and radio controls run unchanged.
function mockConnector(_runtime, _module, exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.NearConnector = class {
    events = {};
    constructor() {
      window.walletTest = {
        switchAccount: accountId => this.events["wallet:signIn"]({ accounts: [{ accountId }] }),
      };
    }
    on(name, callback) { this.events[name] = callback; }
    connect() {
      return new Promise(resolve => {
        window.walletTest.complete = accountId => {
          this.events["wallet:signIn"]({ accounts: [{ accountId }] });
          resolve();
        };
      });
    }
    async disconnect() { this.events["wallet:signOut"](); }
    async getConnectedWallet() { return { accounts: [{ accountId: "restored.testnet" }] }; }
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    for (const width of [390, 1440]) {
      const { context, errors, missing } = await offlineContext(browser, { viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await context.route("**/_next/static/chunks/*.js", async route => {
        const source = fs.readFileSync(path.join(output, "_next/static/chunks", path.basename(new URL(route.request().url()).pathname)), "utf8");
        if (!/\.NearConnector\s*=\s*class/.test(source)) return route.fallback();
        const ast = parse(source, { ecmaVersion: "latest" });
        const factory = ast.body[0].expression.arguments[0].elements.find(node => node && /FunctionExpression/.test(node.type) && /\.NearConnector\s*=\s*class/.test(source.slice(node.start, node.end)));
        assert.ok(factory, "Find the connector export factory rather than mocking the form");
        await route.fulfill({ contentType: "application/javascript", body: source.slice(0, factory.start) + mockConnector.toString() + source.slice(factory.end) });
      });
      await context.route("https://test.rpc.fastnear.com/", route => route.fulfill({ json: { result: { result: [...Buffer.from('"0"')] } } }));
      const page = await context.newPage();
      await page.goto(origin);
      await page.waitForFunction(() => document.cookie.includes("fullback_landing_seen=1"));
      await page.goto(origin + "/signin");
      await page.getByRole("heading", { name: "Sign in to FULLBACK", exact: true }).waitFor();
      const radios = page.getByRole("radio");
      const club = page.getByRole("radio", { name: /^Club/ });
      const academy = page.getByRole("radio", { name: /^Academy/ });
      const federation = page.getByRole("radio", { name: /^Federation/ });
      assert.equal(await radios.count(), 3);
      for (const radio of await radios.all()) assert.equal(await radio.isDisabled(), true);
      await page.getByRole("button", { name: "Connect NEAR wallet" }).click();
      await page.waitForFunction(() => !!window.walletTest?.complete);
      for (const radio of await radios.all()) assert.equal(await radio.isDisabled(), true, "Connecting is not connected");
      await page.evaluate(() => window.walletTest.complete("first.testnet"));
      await page.getByRole("button", { name: "Disconnect wallet" }).waitFor();
      for (const radio of await radios.all()) assert.equal(await radio.isEnabled(), true, "Connected wallet must enable all roles");
      for (const radio of [academy, federation, club]) {
        await radio.check();
        assert.equal(await radio.isChecked(), true);
        assert.equal(await page.locator('input[name="role"]:checked').count(), 1);
      }
      await club.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await academy.isChecked(), true, "Native radio keyboard navigation");
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const screenshots = path.join(web, ".qa", "signin-roles");
      fs.mkdirSync(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, "academy-" + width + ".png"), fullPage: true });
      await page.evaluate(() => window.walletTest.switchAccount("second.testnet"));
      await page.getByText("second.testnet", { exact: true }).waitFor();
      assert.equal(await club.isChecked(), true, "Changing account resets the previous role");
      await federation.check();
      await page.getByRole("button", { name: "Disconnect wallet" }).click();
      await page.getByRole("button", { name: "Connect NEAR wallet" }).waitFor();
      for (const radio of await radios.all()) assert.equal(await radio.isDisabled(), true);
      assert.equal(await club.isChecked(), true);
      await page.evaluate(() => localStorage.setItem("fullback-wallet-connected", "1"));
      await page.reload();
      await page.getByText("restored.testnet", { exact: true }).waitFor();
      assert.equal(await academy.isEnabled(), true, "Restored wallets also enable role selection");
      await academy.check();
      await page.goto(origin + "/dashboard");
      await page.waitForURL(url => url.pathname === "/signin");
      assert.equal(await page.locator(".dashboard").count(), 0, "Choosing a role never grants workspace access");
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      await context.close();
      console.log("PASS wallet roles: disconnected, connecting, connected, all roles, keyboard, account change, disconnect, restore, closed workspace:", width);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
