const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../.qa/node_modules/playwright");
const web = path.resolve(__dirname, "..");
const output = path.join(web, "out");
const origin = "https://fullback.test";
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".txt": "text/plain", ".svg": "image/svg+xml", ".webp": "image/webp", ".ttf": "font/ttf", ".woff2": "font/woff2" };

// Exercise actual production documents, hydration, imports and routing from
// disk. Interception opens no HTTP server and never forwards network traffic.
async function offlineContext(browser, options = {}) {
  const context = await browser.newContext(options);
  const requested = [], errors = [], missing = [];
  context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    requested.push(url.pathname);
    if (url.origin !== origin) return route.abort();
    let target = path.resolve(output, "." + decodeURIComponent(url.pathname));
    if (target !== output && !target.startsWith(output + path.sep)) return route.abort();
    if (target === output) target = path.join(output, "index.html");
    else if (!path.extname(target)) target += ".html";
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      if (request.resourceType() === "document") return route.fulfill({ status: 404, contentType: "text/html", body: fs.readFileSync(path.join(output, "404.html")) });
      missing.push(url.pathname);
      return route.fulfill({ status: 404, body: "Missing offline fixture" });
    }
    return route.fulfill({ status: 200, contentType: mime[path.extname(target)] || "application/octet-stream", body: fs.readFileSync(target) });
  });
  return { context, requested, errors, missing };
}
module.exports = { chromium, web, output, origin, offlineContext };
