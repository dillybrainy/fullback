const fs = require("node:fs");
const path = require("node:path");

// Next's segment URL encoder replaces forward slashes only. Windows builds
// can export nested __next.* folders where the browser requests dotted files.
// Add the expected names; keep original payloads for tooling compatibility.
function normalizeExportPaths(root) {
  let copied = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) { walk(source); continue; }
      if (!entry.name.endsWith(".txt")) continue;
      const parts = path.relative(root, source).split(path.sep);
      const start = parts.findIndex(part => part.startsWith("__next."));
      if (start < 0 || start === parts.length - 1) continue;
      const destination = path.join(root, ...parts.slice(0, start), parts.slice(start).join("."));
      fs.copyFileSync(source, destination);
      copied++;
    }
  }
  walk(root);
  return copied;
}
module.exports = { normalizeExportPaths };
