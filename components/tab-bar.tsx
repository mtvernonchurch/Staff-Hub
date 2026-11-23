"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/action-items", label: "Tasks" },
  { href: "/this-week", label: "Calendar" },
  { href: "/requests", label: "Requests" },
  { href: "/documents", label: "Resources" },
] as const;

export function TabBar({ tasks, requests }: { tasks: number; requests: number }) {
  const path = usePathname();
  const badges: Record<string, number> = { "/action-items": tasks, "/requests": requests };
  return (
    <nav className="tabbar" aria-label="Staff hub">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? path === "/" : path === tab.href || path.startsWith(`${tab.href}/`);
        const count = badges[tab.href] ?? 0;
        return (
          <Link key={tab.href} href={tab.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <TabIcon name={tab.label} />
            {count > 0 ? <span className="tab-badge">{count > 9 ? "9+" : count}</span> : null}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ name }: { name: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true as const };
  if (name === "Home") return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  if (name === "Chat") return <svg {...common}><path d="M5 6h14v9H8l-3 3z" /></svg>;
  if (name === "Tasks") return <svg {...common}><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.5M4.5 12h.5M4.5 17h.5" /></svg>;
  if (name === "Calendar") return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  if (name === "Requests") return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" /></svg>;
  return <svg {...common}><path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /></svg>;
}
