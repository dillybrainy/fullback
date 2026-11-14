"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signInHref } from "@/lib/access-policy.mjs";

export function ClosedWorkspace({ path }: { path: string }) {
  const router = useRouter();
  const href = signInHref(path);
  useEffect(() => { router.replace(href); }, [href, router]);
  // Also the static/no-JS response: no workspace markup or data is passed in.
  return <section className="workspace access-required" aria-labelledby="access-title">
    <h1 id="access-title">Sign in required</h1>
    <p>Wallet sign-in is not available yet. This workspace is closed until sign-in is enabled.</p>
    <div className="actions"><Link className="button" href={href}>Go to sign in</Link><Link className="button secondary" href="/">Back to Home</Link></div>
  </section>;
}
