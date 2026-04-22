"use client";

import { useState } from "react";
import Link from "next/link";

type Row = { id: string; name: string; description: string | null };

type Props = {
  rows: Row[];
  entity: string;
  label: string;
  labelPlural: string;
  color: string;
};

export default function EntityListClient({ rows, entity, label, labelPlural, color }: Props) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : rows;

  return (
    <>
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${labelPlural.toLowerCase()}…`}
          className="w-full px-4 py-2.5 pr-10 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text)] text-sm placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent-hover)] transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-muted)]">
          {query ? (
            <p className="text-lg">No results for "{query}"</p>
          ) : (
            <>
              <p className="text-lg">No {labelPlural.toLowerCase()} yet</p>
              <p className="text-sm mt-1">Add your first one to get started.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li key={row.id}>
              <Link
                href={`/${entity}/${row.id}`}
                className="flex items-start gap-4 px-5 py-4 bg-white rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent-hover)] hover:shadow-sm transition-all"
              >
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)]">{row.name}</p>
                  {row.description && (
                    <p className="text-sm text-[var(--color-muted)] mt-0.5 line-clamp-2">
                      {row.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
