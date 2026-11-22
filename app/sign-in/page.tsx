import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { googleSignInAction, previewAsAction, signOutAction } from "@/app/sign-in/actions";
import { allowedDomain, authMode, googleAuthReady } from "@/lib/config";
import { getStore } from "@/lib/data";
import { accessDecision } from "@/lib/domain/access";
import { normalizeEmail } from "@/lib/domain/people";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const messages: Record<string, string> = {
  AccessDenied: "That account is not an active staff member on the hub. Ask an admin if your work email should be on the Staff tab.",
  Configuration: "Google sign-in is not finished yet.",
  CredentialsSignin: "Choose an active staff member to preview the hub.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const mode = authMode();
  const session = await auth();
  const email = session?.user?.email;
  if (email) {
    const store = await getStore();
    const people = await store.listStaff();
    const person = people.find((row) => normalizeEmail(row.email) === normalizeEmail(email)) ?? null;
    const decision = accessDecision({ email, domain: allowedDomain(), staff: person, provider: "preview" });
    if (decision.ok) redirect("/");
  }

  let people: { name: string; email: string; title: string }[] = [];
  if (mode === "mock") {
    const store = await getStore();
    people = (await store.listStaff()).filter((person) => person.active);
  }

  return (
    <main className="sign-in">
      <section className="sign-card">
        <div className="brand-mark">MV</div>
        <p className="kicker">Mt Vernon Church · Columbus</p>
        <h1>Staff Hub</h1>
        <p className="lede">One place for Monday at 1:00 PM, what you owe the team, and what you need from them.</p>
        {query.error ? <p className="banner banner-error" role="alert">{messages[query.error] ?? "Sign-in did not go through. Try again."}</p> : null}
        {email && query.error === "AccessDenied" ? (
          <form action={signOutAction}>
            <button className="btn" type="submit">Use a different account</button>
          </form>
        ) : null}
        {mode === "google" ? (
          googleAuthReady() ? (
            <form action={googleSignInAction}>
              <button className="btn btn-primary" type="submit">Sign in with Google</button>
            </form>
          ) : (
            <p className="banner banner-error">Google sign-in needs the OAuth client id and secret. The setup steps are in the README.</p>
          )
        ) : (
          <>
            <p className="hint">Preview mode uses sample people, not the real staff list.</p>
            <div className="people">
              {people.map((person) => (
                <form key={person.email} action={previewAsAction}>
                  <input type="hidden" name="email" value={person.email} />
                  <button type="submit">
                    <strong>{person.name}</strong>
                    <span>{person.title}</span>
                  </button>
                </form>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
