const fs = require("node:fs");
const zlib = require("node:zlib");
const path = require("node:path");
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
function measure(root) {
  const js = files(path.join(root, ".next/static")).filter(file => file.endsWith(".js"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".next/prerender-manifest.json"), "utf8"));
  return { emittedJsFiles: js.length, emittedJsGzipBytes: js.reduce((total, file) => total + zlib.gzipSync(fs.readFileSync(file)).length, 0),
    prerenderedRoutes: Object.keys(manifest.routes).filter(route => !route.startsWith("/_")) };
}
const result = { current: measure("."), measuredAt: new Date().toISOString(), note: "All emitted JS chunks, gzipped separately; not initial-page transfer or throughput." };
if (process.argv[2]) result.baseline = measure(process.argv[2]);
console.log(JSON.stringify(result, null, 2));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + "\n", "utf8");
