import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { firstVisitRedirects } from "./lib/landing-entry.mjs";

// Local runs keep secrets in the repo-root .env (CLAUDE.md: `cp .env.example .env`).
// Next only reads web/.env*, so load the root file too. Server-side only: nothing
// is exposed to the browser unless it starts with NEXT_PUBLIC_. On Vercel there is
// no such file and the dashboard env vars are used.
// Variables that are already set (shell, web/.env, Vercel) are not overwritten, so
// scripts/.env.demo (demo account keys written by `npm run setup:demo`) is read
// first: the root .env may list the same names with empty values.
for (const file of ["../scripts/.env.demo", "../.env"]) {
  const envPath = path.resolve(process.cwd(), file);
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

const staticExport = process.env.FULLBACK_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Dev only. Wildcard so a changing hotspot/LAN IP never breaks HMR again:
  // entries are matched on hostname only ("*" = one label, "**.x" = one or
  // more labels), and a bare "*" or "**" never matches — so "**.*" is the
  // widest valid entry (any host with 2+ labels: every IPv4 + every domain).
  allowedDevOrigins: ["**.*"],
  ...(staticExport ? { output: "export" as const } : {}),
  poweredByHeader: false,
  // `*.server.ts` files (API routes such as app/api/reader/route.server.ts) exist
  // only in the server build; a static export cannot serve POST routes.
  pageExtensions: staticExport ? ["tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js", "server.ts"],
  // /api/reader bundles the AI Reader from agent/dist (JavaScript built from the
  // `agent` workspace by `prebuild`). pdf.js stays an external Node package: it
  // loads its worker and fonts from its own folder at runtime.
  serverExternalPackages: ["pdfjs-dist", "near-api-js"],
  images: { unoptimized: true },
  redirects: firstVisitRedirects,
  async rewrites() {
    const reader = process.env.READER_INTERNAL_URL ?? "http://127.0.0.1:3001";
    return [{ source: "/api/reader", destination: `${reader.replace(/\/$/, "")}/api/reader` }];
  },
  async headers() {
    if (staticExport) return [];
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ] },
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};
// Static hosts apply headers themselves; Next's header hook is server-only.
if (staticExport) {
  delete nextConfig.headers;
  delete nextConfig.redirects;
  delete nextConfig.rewrites;
}

export default nextConfig;
