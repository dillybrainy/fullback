import Link from "next/link";

export default function NotFound() {
  return <section className="page-heading"><h1>We could not find that page.</h1><p>Return to the workspace to explore the available agreements.</p><div className="actions" style={{ marginTop: 24 }}><Link className="button" href="/dashboard">Go to My deals</Link></div></section>;
}
