import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { SiteNav } from "@/components/site-nav";
import { LandingEntry } from "@/components/landing-entry";
import "./globals.css";
const schibsted = localFont({
  src: [
    { path: "../public/fonts/schibsted-regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/schibsted-medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/schibsted-semibold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-schibsted", display: "swap", adjustFontFallback: "Arial",
});
export const metadata: Metadata = { title: "FULLBACK | Football transfer payments", description: "Protect football transfer installments and distribute academy royalties on NEAR." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={schibsted.variable} data-scroll-behavior="smooth"><body><a className="skip-link" href="#main-content">Skip to content</a><LandingEntry><SiteNav /><main id="main-content">{children}</main></LandingEntry></body></html>;
}
