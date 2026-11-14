// Optional maintainer command; sharp is supplied by the installed Next toolchain.
const fs = require("node:fs");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

(async () => {
  const photos = {};
  fs.mkdirSync("public/media", { recursive: true });
  for (const name of fs.readdirSync("design-assets").filter(name => name.endsWith(".png"))) {
    if (name === "44-514-imgPhotoPanel.png") continue; // identical to imgHero
    const buffer = fs.readFileSync("design-assets/" + name);
    const metadata = await sharp(buffer).metadata();
    const key = name.replace(".png", "");
    const variants = [];
    for (const width of [480, 960, 1440, 1920].filter(width => width <= metadata.width)) {
      const output = await sharp(buffer).resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer();
      const hash = crypto.createHash("sha256").update(output).digest("hex").slice(0, 12);
      const file = key + "-" + width + "-" + hash + ".webp";
      fs.writeFileSync("public/media/" + file, output);
      variants.push({ width, src: "/media/" + file, bytes: output.length });
    }
    if (!variants.length) throw new Error("Image too small: " + name);
    photos[key] = { width: metadata.width, height: metadata.height, variants };
  }
  fs.writeFileSync("lib/photos.json", JSON.stringify(photos, null, 2) + "\n");
})().catch(error => { console.error(error); process.exitCode = 1; });
