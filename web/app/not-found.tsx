import Link from "next/link";

export default function NotFound() {
  return <section className="page-heading"><h1>We could not find that page.</h1><p>Return to Home to find your way.</p><div className="actions" style={{ marginTop: 24 }}><Link className="button" href="/">Back to Home</Link></div></section>;
}
