"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ showMeetingMode = false }: { showMeetingMode?: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home" },
    { href: "/this-week", label: "This week" },
    ...(showMeetingMode ? [{ href: "/meeting", label: "Meeting mode" }] : []),
    { href: "/action-items", label: "Action items" },
    { href: "/meetings", label: "Meetings" },
    { href: "/checklist", label: "Sunday checklist" },
    { href: "/announcements", label: "Announcements" },
    { href: "/documents", label: "Documents" },
    { href: "/requests", label: "Requests" },
  ];
  return (
    <nav className="nav" aria-label="Staff hub">
      {items.map((item) => {
        const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={active ? "nav-link is-active" : "nav-link"} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
