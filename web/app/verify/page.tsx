import { PageHeading } from "@/components/page-heading";
import { PdfFingerprint } from "@/components/pdf-fingerprint";
export default function Verify() {
  return <div className="workspace verify-page"><PageHeading title="Is this the agreement both clubs signed?" description="Calculate a PDF fingerprint locally, compare it with a recorded NEAR agreement, or choose to send the PDF for AI review." /><PdfFingerprint /><section className="panel verification-explainer"><h2>Every byte tells the story.</h2><p>The same PDF always produces the same SHA-256 fingerprint. Even one changed character creates a different fingerprint.</p><p className="help">A matching on-chain fingerprint confirms the exact file, not its signatures or legal contents. AI review checks extracted terms and shows source clauses; it does not prove that every term is correct.</p></section></div>;
}
