import type { StaffMember } from "@/lib/data/types";
import { emailOnDomain, normalizeEmail } from "@/lib/domain/people";

export type AccessDecision =
  | { ok: true }
  | { ok: false; reason: "missing-email" | "outside-domain" | "unverified" | "unknown" | "inactive" };

export function isAdmin(staff: { role: string }): boolean {
  return staff.role.trim().toLowerCase() === "admin";
}

export function accessDecision(input: {
  email: string | null | undefined;
  domain: string;
  hostDomain?: string | null;
  emailVerified?: boolean | null;
  staff: StaffMember | null;
  provider: "google" | "preview";
}): AccessDecision {
  const email = normalizeEmail(input.email ?? "");
  if (!email) return { ok: false, reason: "missing-email" };
  if (!emailOnDomain(email, input.domain)) return { ok: false, reason: "outside-domain" };
  if (input.provider === "google") {
    if (input.emailVerified === false) return { ok: false, reason: "unverified" };
    if (input.hostDomain && input.hostDomain.trim().toLowerCase() !== input.domain.trim().toLowerCase()) {
      return { ok: false, reason: "outside-domain" };
    }
  }
  if (!input.staff || normalizeEmail(input.staff.email) !== email) return { ok: false, reason: "unknown" };
  if (!input.staff.active) return { ok: false, reason: "inactive" };
  return { ok: true };
}
