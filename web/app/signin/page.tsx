"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";

const roles = [
  { name: "Club", description: "Sell or buy players on installments, protected by collateral.", href: "/dashboard" },
  { name: "Academy", description: "Receive academy royalties from players you trained.", href: "/dashboard?role=academy" },
  { name: "Federation", description: "Monitor every deal. Read-only, no actions.", href: "/federation" },
];
export default function SignIn() {
  const [role, setRole] = useState(roles[0]);
  return <div className="signin-layout">
    <section className="signin-photo"><Image src="/images/44-514-imgPhotoPanel.png" alt="A football pitch at sunrise" fill priority sizes="(max-width:700px) 100vw, 55vw" /><Brand /><div className="signin-caption"><h2>Every club that develops a player deserves to be paid for it.</h2><p>Transfers, installments and academy royalties, settled on NEAR.</p></div></section>
    <section className="signin-form"><h1>Sign in to FULLBACK</h1><p>Connect a NEAR wallet, then choose how you use FULLBACK.</p><span className="field-label">1. Wallet</span><button className="button full-width" disabled aria-describedby="wallet-help"><Image src="/images/44-514-imgIconWallet.svg" width={20} height={20} alt="" />Connect NEAR wallet</button><p id="wallet-help" className="help">Wallet connection is not available yet. You can explore the example workspace below.</p>
      <fieldset className="role-options"><legend>2. I’m signing in as</legend>{roles.map(item => <label className="role-option" key={item.name}><input type="radio" name="role" value={item.name} checked={role.name === item.name} onChange={() => setRole(item)} /><span><strong>{item.name}</strong><small>{item.description}</small></span></label>)}</fieldset>
      <Link className="button full-width" href={role.href}>Explore as {role.name}</Link><p className="preview-note">NEAR testnet only. FULLBACK never holds your keys.<br />Example data · no wallet connected.</p>
    </section>
  </div>;
}
