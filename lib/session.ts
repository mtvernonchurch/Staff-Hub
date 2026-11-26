import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedDomain, previewSignInAllowed, securityProblem } from "@/lib/config";
import { getStore } from "@/lib/data";
import { accessDecision } from "@/lib/domain/access";
import { normalizeEmail } from "@/lib/domain/people";
import { HubError } from "@/lib/hub-error";
import type { HubStore, StaffMember } from "@/lib/data/types";

export async function requireStaff(): Promise<{ staff: StaffMember; store: HubStore }> {
  const problem = securityProblem();
  if (problem) throw new HubError(problem);
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
  return previewSignInAllowed();
}
