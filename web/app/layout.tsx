import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";
export const metadata: Metadata = { title: "FULLBACK | Football transfer payments", description: "Protect football transfer installments and distribute academy royalties on NEAR." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><SiteNav /><main id="main-content">{children}</main></body></html>;
}
