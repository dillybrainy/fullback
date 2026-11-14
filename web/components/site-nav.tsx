"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { isPublicRoute } from "@/lib/access-policy.mjs";
import { useWallet } from "./wallet-provider";

export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/signin" || !isPublicRoute(pathname)) return null;
  return <PublicNavigation key={pathname} pathname={pathname} />;
}

// Long testnet names would push the menu out of shape: "nordvik.fullback-team.testnet" -> "nordvik.fullb…testnet".
function shortAccount(accountId: string) {
  return accountId.length <= 22 ? accountId : accountId.slice(0, 13) + "…" + accountId.slice(-7);
}

function PublicNavigation({ pathname }: { pathname: string }) {
  const { accountId } = useWallet();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);
  const links = [["/", "Home"], ["/#how-it-works", "How it works"], ["/#for-clubs", "For clubs"], ["/#faq", "FAQ"], ["/verify", "Verify PDF"]];
  return <header ref={header} className={"site-header" + (pathname === "/" ? " public-header" : "")}>
    <Brand />
    <nav id="main-navigation" className={"site-nav" + (open ? " is-open" : "")} aria-label="Main navigation">
      {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
      <Link href="/signin" className="button" onClick={() => setOpen(false)}>{accountId ? shortAccount(accountId) : "Connect wallet"}</Link>
    </nav>
    <button ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
  </header>;
}
