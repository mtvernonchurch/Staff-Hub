"use client";

import { useMemo, useState } from "react";

export type SearchHit = { href: string; title: string; kind: string; external?: boolean };

export function HomeSearch({ initials, items }: { initials: string; items: SearchHit[] }) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return items.filter((item) => item.title.toLowerCase().includes(needle)).slice(0, 8);
  }, [items, query]);

  return (
    <div className="home-search">
      <label className="search-field">
        <span className="search-icon" aria-hidden>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks, files, people"
          aria-label="Search tasks, files, people"
          autoComplete="off"
        />
      </label>
      <span className="avatar avatar-lg" aria-hidden>{initials}</span>
      {hits.length > 0 ? (
        <ul className="search-results">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.title}`}>
              {hit.href ? (
                <a href={hit.href} {...(hit.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                  <strong>{hit.title}</strong>
                  <span>{hit.kind}</span>
                </a>
              ) : (
                <span className="search-plain"><strong>{hit.title}</strong><span>{hit.kind}</span></span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
