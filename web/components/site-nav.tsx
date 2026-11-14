"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const home = pathname === "/";
  const federation = pathname === "/federation";
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); setAccountOpen(false); } }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  if (pathname === "/signin") return null;
  const links = home ? [["/#how-it-works", "How it works"], ["/#for-clubs", "For clubs"], ["/#faq", "FAQ"]] : federation ? [["/federation", "Overview"], ["/verify", "Verify"]] : [["/dashboard", "Dashboard"], ["/deals/new", "New deal"], ["/verify", "Verify"]];
  return <header className={"site-header" + (home ? " public-header" : " app-header")}><Brand /><nav className={"site-nav" + (open ? " is-open" : "")} aria-label="Main navigation">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}{home && <Link href="/signin" className="button" onClick={() => setOpen(false)}>Connect wallet</Link>}</nav>{!home && <div className="account-container" ref={accountRef}><button className="account-button" aria-label="Open account menu" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen(!accountOpen)}><span className="club-avatar"><Image src="/images/19-2-imgCrest.svg" width={22} height={26} alt="" /></span><span><strong>{federation ? "National Federation · Federation" : "Example workspace · Club"}</strong><small>NEAR testnet · Preview</small></span><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m4 5.5 3 3 3-3" stroke="currentColor" /></svg></button>{accountOpen && <div id="account-menu" className="account-menu"><p>Example workspace</p><Link href="/signin" onClick={() => setAccountOpen(false)}>Switch role</Link><Link href="/federation" onClick={() => setAccountOpen(false)}>Federation view</Link><a href="https://testnet.nearblocks.io">Open NEAR explorer</a></div>}</div>}<button className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.5" /></svg></button></header>;
}

