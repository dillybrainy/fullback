const { spawnSync } = require("node:child_process");
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  stdio: "inherit",
  env: { ...process.env, FULLBACK_STATIC_EXPORT: "1" },
});
if (result.error) { console.error(result.error); process.exitCode = 1; }
else {
  process.exitCode = result.status ?? 1;
  if (process.exitCode === 0) {
    const { normalizeExportPaths } = require("./static-export-paths.cjs");
    const copied = normalizeExportPaths(require("node:path").resolve("out"));
    if (copied) console.log(`Added ${copied} portable static prefetch payload names.`);
  }
}
