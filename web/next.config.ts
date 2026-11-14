import type { NextConfig } from "next";
import { firstVisitRedirects } from "./lib/landing-entry.mjs";
const staticExport = process.env.FULLBACK_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Dev only. Wildcard so a changing hotspot/LAN IP never breaks HMR again:
  // entries are matched on hostname only ("*" = one label, "**.x" = one or
  // more labels), and a bare "*" or "**" never matches — so "**.*" is the
  // widest valid entry (any host with 2+ labels: every IPv4 + every domain).
  allowedDevOrigins: ["**.*"],
  ...(staticExport ? { output: "export" as const } : {}),
  poweredByHeader: false,
  images: { unoptimized: true },
  redirects: firstVisitRedirects,
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
}

export default nextConfig;
