import Link from "next/link";
export function ArrowLink({ href, label = "View deal" }: { href: string; label?: string }) {
  return <Link className="circle-link" href={href} aria-label={label}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>;
}
export function ProgressSegments() {
  return <div className="progress-segments" role="img" aria-label="2 of 3 installments paid; second covered by collateral"><span className="done" /><span className="covered" /><span /></div>;
}
export function WarningStatus() {
  return <span className="status warning"><i className="status-card" aria-hidden="true" />Buyer must top up</span>;
}
export function PreviewNote() {
  return <p className="preview-note">Example data only. Wallet and contract connections are not available yet.</p>;
}
