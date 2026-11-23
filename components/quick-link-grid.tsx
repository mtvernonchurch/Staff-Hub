"use client";

import { useState } from "react";
import type { QuickLink } from "@/lib/data/types";

export function QuickLinkGrid({ links }: { links: QuickLink[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? links : links.slice(0, 9);
  return (
    <div>
      <div className="tile-grid">
        {shown.map((link) => (
          <a key={link.id} className="program-tile" href={link.url} target="_blank" rel="noreferrer">
            <span className={`tile-badge tile-${link.color || "navy"}`}>{link.initials}</span>
            <span>{link.name}</span>
          </a>
        ))}
      </div>
      {links.length > 9 ? (
        <button className="btn btn-small" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Show less" : `Show all ${links.length}`}
        </button>
      ) : null}
    </div>
  );
}
