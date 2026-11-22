import Link from "next/link";
import { previewAsAction, signOutAction } from "@/app/sign-in/actions";
import { Nav } from "@/components/nav";
import { dataMode } from "@/lib/config";
import type { StaffMember } from "@/lib/data/types";
import { isAdmin } from "@/lib/domain/access";
import { initials } from "@/lib/domain/people";

export function Shell({
  staff,
  people,
  preview,
  children,
}: {
  staff: StaffMember;
  people: StaffMember[];
  preview: boolean;
  children: React.ReactNode;
}) {
  const foot = (
    <div className="rail-foot">
      <div className="person">
        <span className="avatar" aria-hidden>{initials(staff.name)}</span>
        <div>
          <strong>{staff.name}</strong>
          <small>{staff.title} · {isAdmin(staff) ? "Admin" : "Staff"}</small>
        </div>
      </div>
      {preview ? (
        <form action={previewAsAction} className="stack-form">
          <label className="field">
            Preview as
            <select name="email" defaultValue={staff.email}>
              {people.map((person) => (
                <option key={person.email} value={person.email}>{person.name}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-ghost btn-small" type="submit">Switch</button>
        </form>
      ) : null}
      <form action={signOutAction}>
        <button className="btn btn-ghost btn-small" type="submit">Sign out</button>
      </form>
    </div>
  );

  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand">
          <span className="brand-mark">MV</span>
          <span>
            <span className="brand-name">Staff Hub</span>
            <span className="brand-sub">Mt Vernon Church</span>
          </span>
        </Link>
        <Nav />
        {foot}
      </aside>
      <div className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">MV</span>
          <span>
            <span className="brand-name">Staff Hub</span>
            <span className="brand-sub">{staff.name}</span>
          </span>
        </Link>
        <Nav />
        <div className="button-row">
          {preview ? (
            <form action={previewAsAction} className="button-row">
              <label className="field" style={{ minWidth: 180 }}>
                <span className="hint">Preview as</span>
                <select name="email" defaultValue={staff.email}>
                  {people.map((person) => (
                    <option key={person.email} value={person.email}>{person.name}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-ghost btn-small" type="submit">Switch</button>
            </form>
          ) : null}
          <form action={signOutAction}>
            <button className="btn btn-ghost btn-small" type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div className="main">
        {dataMode() === "mock" ? (
          <p className="preview-banner">Preview mode. These are sample people and sample records, not the church sheet.</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
