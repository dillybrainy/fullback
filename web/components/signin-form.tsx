import Link from "next/link";
import { WalletConnect } from "./wallet-connect";

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
    <WalletConnect />
    <fieldset className="role-options" disabled aria-describedby="wallet-help"><legend>2. I’m signing in as</legend>
      {roles.map((role, index) => <label className="role-option" key={role.name}><input type="radio" name="role" value={role.name} defaultChecked={index === 0} /><span><strong>{role.name}</strong><small>{role.description}</small></span></label>)}
    </fieldset>
    <Link className="button full-width" href="/verify">Verify a PDF</Link>
    <p className="preview-note">NEAR testnet only. FULLBACK never holds your keys.</p>
  </section>;
}
