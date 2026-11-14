import Link from "next/link";
import { WalletConnect } from "./wallet-connect";
import { SignInRoles } from "./signin-roles";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function SignInForm() {
  return <section className="signin-form">
    <Link className="back-home" href="/">Back to Home</Link>
    <h1>Sign in to FULLBACK</h1>
    <p>Connect a NEAR wallet, then choose how you use FULLBACK.</p>
    <span className="field-label">1. Wallet</span>
    <WalletConnect />
    <SignInRoles />
    <Button size="lg" render={<Link href="/verify" />} nativeButton={false}>Verify a PDF<ArrowUpRight data-icon="inline-end" /></Button>
    <p className="preview-note">NEAR testnet only. FULLBACK never holds your keys.</p>
  </section>;
}
