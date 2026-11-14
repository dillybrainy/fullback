import Link from "next/link";
import { StaticIcon as Image } from "./static-icon";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

const roles = [
  { name: "Club", description: "Sell or buy players on installments, protected by collateral." },
  { name: "Academy", description: "Receive academy royalties from players you trained." },
  { name: "Federation", description: "Monitor every deal. Read-only, no actions." },
];

export function SignInForm() {
  return <section className="signin-form">
    <Link className="back-home" href="/">Back to Home</Link>
    <h1>Sign in to FULLBACK</h1>
    <p>Connect a NEAR wallet, then choose how you use FULLBACK.</p>
    <span className="field-label">1. Wallet</span>
    <button className="button full-width" disabled aria-describedby="wallet-help"><Image src="/images/44-514-imgIconWallet.svg" width={20} height={20} alt="" />Connect NEAR wallet</button>
    <p id="wallet-help" className="help">Wallet sign-in is not available yet. Dashboard, deals and federation are closed until sign-in is enabled.</p>
    <fieldset className="role-options" disabled aria-describedby="wallet-help"><legend>2. I’m signing in as</legend>
      {roles.map((role, index) => <label className="role-option" key={role.name}><input type="radio" name="role" value={role.name} defaultChecked={index === 0} /><span><strong>{role.name}</strong><small>{role.description}</small></span></label>)}
    </fieldset>
    <Button size="lg" render={<Link href="/verify" />} nativeButton={false}>Verify a PDF<ArrowUpRight data-icon="inline-end" /></Button>
    <p className="preview-note">NEAR testnet only. FULLBACK never holds your keys.<br />No wallet connected.</p>
  </section>;
}
