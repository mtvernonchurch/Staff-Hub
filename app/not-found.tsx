import Link from "next/link";

export default function NotFound() {
  return (
    <main className="sign-in">
      <section className="sign-card">
        <p className="kicker">Staff Hub</p>
        <h1>That page is not here</h1>
        <p className="lede">The link may be old, or the record was never on the list.</p>
        <Link className="btn btn-primary" href="/">Back home</Link>
      </section>
    </main>
  );
}
