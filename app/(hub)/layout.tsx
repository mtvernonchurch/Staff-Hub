import { Shell } from "@/components/shell";
import { Problem } from "@/components/ui";
import { authMode } from "@/lib/config";
import { isClosedStatus } from "@/lib/domain/dates";
import { namesMatch } from "@/lib/domain/people";
import { isFrameworkError } from "@/lib/framework";
import { HubError } from "@/lib/hub-error";
import { requireStaff } from "@/lib/session";
import { requestWaitingOn } from "@/lib/services/hub";

export const dynamic = "force-dynamic";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const loaded = await loadShell();
  if (!loaded.ok) return <Problem message={loaded.message} />;
  return (
    <Shell staff={loaded.staff} people={loaded.people} preview={loaded.preview} badges={loaded.badges}>
      {children}
    </Shell>
  );
}

async function loadShell() {
  try {
    const { staff, store } = await requireStaff();
    const [people, tasks, requests] = await Promise.all([
      authMode() === "mock" ? store.listStaff().then((rows) => rows.filter((person) => person.active)) : Promise.resolve([]),
      store.listActionItems(),
      store.listRequests(),
    ]);
    return {
      ok: true as const,
      staff,
      people,
      preview: authMode() === "mock",
      badges: {
        tasks: tasks.filter((item) => namesMatch(item.owner, staff.name) && !isClosedStatus(item.status)).length,
        requests: requests.filter((request) => requestWaitingOn(staff, request)).length,
      },
    };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    const message = error instanceof HubError ? error.message : "The hub could not open the staff list.";
    return { ok: false as const, message };
  }
}
