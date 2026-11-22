import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedDomain, authMode, dataMode } from "@/lib/config";
import { getStore } from "@/lib/data";
import { accessDecision } from "@/lib/domain/access";
import { normalizeEmail } from "@/lib/domain/people";
import { HubError } from "@/lib/hub-error";
import type { HubStore, StaffMember } from "@/lib/data/types";

export async function requireStaff(): Promise<{ staff: StaffMember; store: HubStore }> {
  if (process.env.NODE_ENV === "production" && dataMode() === "sheets" && !process.env.AUTH_SECRET) {
    throw new HubError("Set AUTH_SECRET in the hosting environment before opening the real staff list.");
  }
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/sign-in");
  const store = await getStore();
  const staffList = await store.listStaff();
  const person = staffList.find((row) => normalizeEmail(row.email) === normalizeEmail(email)) ?? null;
  const decision = accessDecision({
    email,
    domain: allowedDomain(),
    staff: person,
    provider: "preview",
  });
  if (!decision.ok || !person) redirect("/sign-in?error=AccessDenied");
  return { staff: person, store };
}

export function showPreviewSwitcher(): boolean {
  return authMode() === "mock";
}
