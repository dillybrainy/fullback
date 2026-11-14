import { PageHeading } from "@/components/page-heading";
import { PdfFingerprint } from "@/components/pdf-fingerprint";
export default function Verify() {
  return <div className="workspace verify-page"><PageHeading title="Is this the agreement both clubs signed?" description="Drop a PDF here. Its fingerprint is computed in your browser. The file never leaves your computer." /><PdfFingerprint /><section className="panel verification-explainer"><h2>Every byte tells the story.</h2><p>The same PDF always produces the same SHA-256 fingerprint. Even one changed character creates a different fingerprint.</p><p className="help">On-chain comparison will be available after the testnet contract is connected. A calculated fingerprint does not verify signatures or the agreement’s contents.</p></section></div>;
}
