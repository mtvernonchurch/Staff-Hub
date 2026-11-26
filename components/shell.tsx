import Link from "next/link";
import { Bell } from "lucide-react";
import { previewAsAction, signOutAction } from "@/app/sign-in/actions";
import { Dock } from "@/components/tab-bar";
import { LOGO_URL } from "@/lib/brand";
import { dataMode } from "@/lib/config";
import type { StaffMember } from "@/lib/data/types";
import { greeting } from "@/lib/domain/dates";
import { firstName } from "@/lib/domain/people";

export function Shell({
  staff,
  people,
  preview,
  badges,
  children,
}: {
  staff: StaffMember;
  people: StaffMember[];
  preview: boolean;
  badges: { tasks: number; requests: number };
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src={LOGO_URL} alt="Mt Vernon Church" width={46} height={46} />
          <span>
            <span className="brand-name">Welcome, {firstName(staff.name)}</span>
            <span className="brand-sub">{greeting()}</span>
          </span>
        </div>
        <div className="button-row">
          {preview ? (
            <form action={previewAsAction} className="button-row">
              <label className="field" style={{ minWidth: 160 }}>
                <span className="hint">Preview as</span>
                <select name="email" defaultValue={staff.email}>
                  {people.map((person) => (
                    <option key={person.email} value={person.email}>{person.name}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-small" type="submit">Switch</button>
            </form>
          ) : null}
          <Link className="btn btn-small btn-icon" href="/notifications">
            <Bell aria-hidden size={16} />
            <span>Alerts</span>
          </Link>
          <form action={signOutAction}>
            <button className="btn btn-small" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main className="main" id="main">
        {dataMode() === "mock" ? (
          <p className="preview-banner">Preview mode. These are sample people and sample records, not the church sheet.</p>
        ) : null}
        {children}
      </main>
      <Dock tasks={badges.tasks} requests={badges.requests} />
    </div>
  );
}
