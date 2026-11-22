import { Shell } from "@/components/shell";
import { Problem } from "@/components/ui";
import { authMode } from "@/lib/config";
import { isFrameworkError } from "@/lib/framework";
import { HubError } from "@/lib/hub-error";
import { requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  try {
    const { staff, store } = await requireStaff();
    const people = authMode() === "mock" ? (await store.listStaff()).filter((person) => person.active) : [];
    return (
      <Shell staff={staff} people={people} preview={authMode() === "mock"}>
        {children}
      </Shell>
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "The hub could not open the staff list.";
    return <Problem message={message} />;
  }
}
