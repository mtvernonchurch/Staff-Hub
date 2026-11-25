"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCK_TABS, dockActive } from "@/lib/dock";

export function Dock({ tasks, requests }: { tasks: number; requests: number }) {
  const path = usePathname();
  const badges: Record<string, number> = { "/action-items": tasks, "/requests": requests };
  return (
    <nav className="dock" aria-label="Staff hub">
      {DOCK_TABS.map((tab) => {
        const active = dockActive(path, tab);
        const count = badges[tab.href] ?? 0;
        return (
          <Link key={tab.href} href={tab.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <DockIcon name={tab.label} />
            {count > 0 ? <span className="tab-badge">{count > 9 ? "9+" : count}</span> : null}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DockIcon({ name }: { name: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true as const };
  if (name === "Home") return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  if (name === "Tasks") return <svg {...common}><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.5M4.5 12h.5M4.5 17h.5" /></svg>;
  if (name === "Calendar") return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  if (name === "Meetings") return <svg {...common}><circle cx="8" cy="8" r="2.2" /><circle cx="16" cy="8" r="2.2" /><path d="M3.8 18.2c.7-2.6 2.6-3.8 4.2-3.8s3.5 1.2 4.2 3.8" /><path d="M13.2 18.2c.5-2 1.9-3.1 3.4-3.1 1.6 0 2.8 1 3.4 2.8" /></svg>;
  if (name === "Requests") return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" /></svg>;
  return <svg {...common}><path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /></svg>;
}
