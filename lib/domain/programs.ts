import type { Ministry, QuickLink, StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { namesMatch } from "@/lib/domain/people";
import { sortByOrder } from "@/lib/domain/view";

export function visibleProgramLinks(
  actor: StaffMember,
  links: QuickLink[],
  ministries: Ministry[],
  includeHidden = false,
): QuickLink[] {
  return sortByOrder(links).filter((link) => {
    if (link.hidden && !includeHidden) return false;
    if (isAdmin(actor)) return true;
    if (link.hidden) return false;
    const who = link.visibleTo.trim() || "All";
    if (/^admin$/i.test(who)) return false;
    if (/^all$/i.test(who)) return true;
    return ministries.some((row) => namesMatch(row.ministry, who) && namesMatch(row.lead, actor.name));
  });
}
