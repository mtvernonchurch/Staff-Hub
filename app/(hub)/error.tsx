"use client";

export default function HubErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="problem">
      <p className="kicker">Staff Hub</p>
      <h1>This page did not load</h1>
      <p className="lede">{error.message || "Try again in a moment."}</p>
      <button className="btn btn-primary" type="button" onClick={() => reset()}>Try again</button>
    </section>
  );
}
