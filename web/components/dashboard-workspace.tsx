"use client";
import { useState } from "react";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { ArrowLink, PreviewNote, ProgressSegments, WarningStatus } from "@/components/deal-ui";
import { sampleDeal as deal, money, displayDate } from "@/lib/mock";
import { initialDashboardView, dashboardDealView } from "@/lib/deal-view.mjs";

const clubs = [deal.seller, deal.buyer, "Eastgate Youth", "Pine Hill Academy"];
const views = ["Selling", "Buying", "Academy royalties"] as const;
export default function DashboardWorkspace({ role, tab }: { role?: string; tab?: string }) {
  const initial = initialDashboardView(deal, { role, tab });
  const [club, setClub] = useState<string>(initial.club);
  const [view, setView] = useState<(typeof views)[number]>(initial.view);
  const [status, setStatus] = useState("All statuses");
  const { recipient, visible, buying, nextAmount, receivedAmount } = dashboardDealView(deal, club, view, status);
  return <div className="workspace">
    <div className="heading-row"><PageHeading title="My deals" description={"Every deal " + club + " is part of, as seller, buyer or academy."} /><Link className="button" href="/deals/new">New deal</Link></div>
    <div className="stats-grid">
      <article className="panel stat"><p>{buying ? "Still to pay" : "Still to receive"}</p><strong>{new Intl.NumberFormat("en-GB").format(nextAmount)}</strong><small>fEUR from 1 installment</small></article>
      <article className="panel stat"><p>{buying ? "Paid so far" : "Received so far"}</p><strong>{new Intl.NumberFormat("en-GB").format(receivedAmount)}</strong><small>fEUR from 2 installments</small></article>
      <article className={"panel stat" + (recipient ? "" : " attention")}><p>{recipient ? "Payments received" : "Needs attention"}</p><strong>{recipient ? "2 payments" : "1 deal"}</strong><small>{recipient ? "Academy royalties from R. Santos" : "Kingsport FC must top up collateral"}</small></article>
      <article className="panel stat"><p>{recipient ? "Academy royalty" : buying ? "Collateral required" : "Sell-on rights"}</p><strong>{recipient ? (recipient.amount / 2_000_000 * 100) + "%" : buying ? "2,000,000" : "10%"}</strong><small>{recipient ? "of every installment" : buying ? "fEUR to restore before the next installment" : "of R. Santos’s next transfer fee"}</small></article>
    </div>
    <section className="panel"><div className="toolbar"><nav className="view-switcher" aria-label="Deal categories">{views.map(name => <button key={name} type="button" aria-pressed={view === name} onClick={() => setView(name)}>{name}<span className="count">{name === "Selling" ? Number(club === deal.seller) : name === "Buying" ? Number(club === deal.buyer) : Number(Boolean(recipient))}</span></button>)}</nav><select aria-label="Filter deals by status" className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>{["All statuses", "Must top up", "Active", "Completed", "Defaulted"].map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="tab-content" key={view + club + status}>{visible ? <div className="table-scroll"><table className="deals-table"><caption className="sr-only">{view} deals for {club}</caption><thead><tr>{["Player", "Counterparty", "Your role", "Fee (fEUR)", "Progress", "Next", "Status", ""].map((label, i) => <th key={i} scope="col">{label}</th>)}</tr></thead><tbody><tr><td><strong>{deal.player}</strong><small>Age {deal.age}</small></td><td>{view === "Buying" ? deal.seller : deal.buyer}</td><td>{recipient ? "Academy" : view === "Buying" ? "Buyer" : "Seller"}</td><td>{new Intl.NumberFormat("en-GB").format(deal.fee)}</td><td><ProgressSegments /><small>2 of 3 · #2 covered by collateral</small></td><td>Installment 3<small>{displayDate(deal.installments[2].due)}</small></td><td><WarningStatus /></td><td><ArrowLink href={"/deals/" + deal.id} /></td></tr></tbody></table></div> : <div className="empty-state"><h2>No deals in this category</h2><p>Choose another club, category, or status to explore its deals.</p><Link className="button" href="/deals/new">Create a deal</Link></div>}</div>
    </section>
    <div className="two-columns"><section className="panel"><h2>Coming due</h2><ul className="compact-list"><li><span className="step-number">3</span><div><strong>Installment 3 of 3</strong><small>Kingsport FC · {displayDate(deal.installments[2].due)}</small></div><span>{money(nextAmount)} {buying ? "to pay" : "to you"}</span></li></ul><p className="help">{buying ? "Restore your collateral before the next installment is due to keep the deal active." : "If a payment is late, the collector agent settles it from collateral. You don’t need to do anything."}</p></section><section className="panel"><h2>{recipient ? "Your academy royalty" : buying ? "Where your payment goes" : "Academies you pay"}</h2><p className="help">{recipient ? "Your share is paid automatically whenever an installment is collected." : buying ? "Each payment is split between Riverside SC and the academies that trained the player." : "Every installment you receive automatically sends a share to the academies that trained the player."}</p><div className="soft-box">{recipient ? <><div>{recipient.name}<span>{money(recipient.amount)} per installment</span></div><div>Received so far<span>{money(recipient.amount * 2)}</span></div></> : <><div>Eastgate Youth · ages 16–20 <span>2.5% · 50,000 per installment</span></div><div>Pine Hill Academy · ages 13–15 <span>0.75% · 15,000 per installment</span></div></>}</div></section></div>
    <div className="toolbar preview-note"><label>Viewing example club <select aria-label="Viewing example club" value={club} onChange={e => setClub(e.target.value)}>{clubs.map(name => <option key={name}>{name}</option>)}</select></label><PreviewNote /></div>
  </div>;
}
