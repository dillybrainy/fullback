"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { hasLandingCookie, LANDING_COOKIE } from "@/lib/landing-entry.mjs";

const enteredEvent = "fullback:landing-seen";
let enteredInMemory = false;
const hasEntered = () => enteredInMemory || hasLandingCookie(document.cookie);
const serverSnapshot = () => false;
function subscribe(notify: () => void) {
  window.addEventListener(enteredEvent, notify);
  window.addEventListener("pageshow", notify);
  window.addEventListener("focus", notify);
  return () => {
    window.removeEventListener(enteredEvent, notify);
    window.removeEventListener("pageshow", notify);
    window.removeEventListener("focus", notify);
  };
}

export function LandingEntry({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const entered = useSyncExternalStore(subscribe, hasEntered, serverSnapshot);
  useEffect(() => {
    if (pathname === "/") {
      if (!hasEntered()) {
        enteredInMemory = true;
        document.cookie = `${LANDING_COOKIE}=1; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        window.dispatchEvent(new Event(enteredEvent));
      }
    } else if (!hasEntered()) router.replace("/");
  }, [pathname, router]);

  if (pathname === "/" || entered) return children;
  // Static hosts have no request-time redirects; also usable without JS.
  return <main id="main-content"><section className="workspace access-required" aria-labelledby="entry-title">
    <noscript><meta httpEquiv="refresh" content="0;url=/" /></noscript>
    <h1 id="entry-title">Start at FULLBACK</h1>
    <p>Visit Home to get started.</p>
    <div className="actions"><Link className="button" href="/">Go to Home</Link></div>
  </section></main>;
}
