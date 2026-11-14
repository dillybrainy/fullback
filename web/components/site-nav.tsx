"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, FileCheck2, Menu, Wallet, X } from "lucide-react";
import { Brand } from "./brand";
import { useWallet } from "./wallet-provider";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { isPublicRoute } from "@/lib/access-policy.mjs";
import { cn } from "@/lib/utils";

const links = [["/", "Home"], ["/#how-it-works", "How it works"], ["/#for-clubs", "For clubs"], ["/#faq", "FAQ"]];
const readHash = () => window.location.hash;
const serverHash = () => "";
function subscribeHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  return () => { window.removeEventListener("hashchange", notify); window.removeEventListener("popstate", notify); };
}

export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/signin" || !isPublicRoute(pathname)) return null;
  return <PublicNavigation key={pathname} pathname={pathname} />;
}

function PublicNavigation({ pathname }: { pathname: string }) {
  const { accountId } = useWallet();
  const walletLabel = accountId ? (accountId.length <= 22 ? accountId : accountId.slice(0, 13) + "…" + accountId.slice(-7)) : "Connect wallet";
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1101px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const MobileLink = pathname === "/" ? "a" : Link;
  const current = pathname === "/" ? pathname + hash : pathname;
  return <header className={cn("site-header", pathname === "/" && "public-header")}>
    <Brand light />
    <NavigationMenu className="desktop-navigation" aria-label="Main navigation">
      <NavigationMenuList>{links.map(([href, label]) => <NavigationMenuItem key={href}>
        <NavigationMenuLink render={pathname === "/" ? <a href={href === "/" ? "#" : href} /> : <Link href={href} />} active={current === href} onClick={() => setOpen(false)}>{label}</NavigationMenuLink>
      </NavigationMenuItem>)}</NavigationMenuList>
    </NavigationMenu>
    <div className="navbar-actions">
      <Button variant="inverse" render={<Link href="/verify" />} nativeButton={false}><FileCheck2 data-icon="inline-start" />Verify PDF</Button>
      <Button variant="accent" render={<Link href="/signin" title={accountId ?? undefined} />} nativeButton={false}>{walletLabel}<ArrowUpRight data-icon="inline-end" /></Button>
    </div>
    <div className="navbar-mobile-actions">
      <Button variant="accent" size="icon" render={<Link href="/signin" />} nativeButton={false} aria-label={accountId ? "Connected wallet: " + accountId : "Connect wallet"}><Wallet /></Button>
      <Popover open={open} onOpenChange={(value, details) => {
        const event = details.event;
        setInstant(event.type.startsWith("key") || (event.type === "click" && "detail" in event && event.detail === 0));
        setOpen(value);
      }}>
        <PopoverTrigger render={<Button variant="navigation" size="icon" />} aria-label={open ? "Close navigation" : "Open navigation"}>
          {open ? <X /> : <Menu />}
        </PopoverTrigger>
        <PopoverContent variant="navigation" align="end" sideOffset={16} data-instant={instant || undefined}>
          <PopoverHeader><PopoverTitle className="sr-only">FULLBACK navigation</PopoverTitle></PopoverHeader>
          <nav className="mobile-navigation" aria-label="Main navigation">{links.map(([href, label]) => <MobileLink href={pathname === "/" && href === "/" ? "#" : href} key={href} aria-current={current === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}<ArrowUpRight aria-hidden="true" /></MobileLink>)}</nav>
          <div className="mobile-navigation-actions">
            <Button variant="inverse" render={<Link href="/verify" />} nativeButton={false} onClick={() => setOpen(false)}><FileCheck2 data-icon="inline-start" />Verify PDF</Button>
            <Button variant="accent" render={<Link href="/signin" title={accountId ?? undefined} />} nativeButton={false} onClick={() => setOpen(false)}>{walletLabel}<ArrowUpRight data-icon="inline-end" /></Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </header>;
}
