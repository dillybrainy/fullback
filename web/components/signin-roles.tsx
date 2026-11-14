"use client";
import { useWallet } from "./wallet-provider";

const roles = [
  { name: "Club", description: "Sell or buy players on installments, protected by collateral." },
  { name: "Academy", description: "Receive academy royalties from players you trained." },
  { name: "Federation", description: "Monitor every deal. Read-only, no actions." },
];

export function SignInRoles() {
  const { status, accountId } = useWallet();
  const connected = status === "connected" && Boolean(accountId);
  // A role is a UI preference, not authorization. Reset it when the wallet changes.
  return <fieldset key={connected ? accountId : "disconnected"} className="role-options" disabled={!connected} aria-describedby="wallet-help"><legend>2. I’m signing in as</legend>
    {roles.map((role, index) => <label className="role-option" key={role.name}><input type="radio" name="role" value={role.name} defaultChecked={index === 0} /><span><strong>{role.name}</strong><small>{role.description}</small></span></label>)}
  </fieldset>;
}
