"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/action-items", label: "Action items" },
  { href: "/meetings", label: "Meetings" },
  { href: "/checklist", label: "Sunday checklist" },
  { href: "/announcements", label: "Announcements" },
  { href: "/documents", label: "Documents" },
  { href: "/requests", label: "Requests" },
];

export function Nav() {
  const path = usePathname();
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
