import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { allowedDomain, authMode, authSecret, googleAuthReady } from "@/lib/config";
import { getStore } from "@/lib/data";
import { accessDecision } from "@/lib/domain/access";
import { normalizeEmail } from "@/lib/domain/people";

const domain = allowedDomain();
const mode = authMode();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  providers: [
    ...(mode === "google" && googleAuthReady()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
              params: { hd: domain, prompt: "select_account" },
            },
          }),
        ]
      : []),
    ...(mode === "mock"
      ? [
          Credentials({
            id: "preview",
            name: "Preview",
            credentials: { email: { label: "Email", type: "email" } },
            authorize: async (credentials) => {
              const email = String(credentials?.email ?? "");
              const store = await getStore();
              const staff = await store.listStaff();
              const person = staff.find((row) => normalizeEmail(row.email) === normalizeEmail(email)) ?? null;
              const decision = accessDecision({ email, domain, staff: person, provider: "preview" });
              if (!decision.ok || !person) return null;
              return { id: person.email, email: person.email, name: person.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const googleProfile = profile as { email?: string; email_verified?: boolean; hd?: string } | undefined;
      const email = user.email ?? googleProfile?.email;
      const store = await getStore();
      const staff = await store.listStaff();
      const person = staff.find((row) => normalizeEmail(row.email) === normalizeEmail(email ?? "")) ?? null;
      const decision = accessDecision({
        email,
        domain,
        hostDomain: googleProfile?.hd,
        emailVerified: googleProfile?.email_verified,
        staff: person,
        provider: account?.provider === "google" ? "google" : "preview",
      });
      return decision.ok;
    },
    jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.email === "string") session.user.email = token.email;
      return session;
    },
  },
});
