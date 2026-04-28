"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ENTITY_CONFIGS } from "@/lib/entities";

type SearchResult = {
  id: string;
  name: string;
  description: string | null;
  entity_type: string;
};

type Counts = Record<string, number>;

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch counts on mount
  useEffect(() => {
    Promise.all(
      ENTITY_CONFIGS.map((ec) =>
        fetch(`/api/entities/${ec.type}`)
          .then((r) => r.json())
          .then((rows: unknown[]) => [ec.type, rows.length] as [string, number])
      )
    ).then((pairs) => setCounts(Object.fromEntries(pairs)));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const params = new URLSearchParams({ q: query.trim() });
      if (filter !== "all") params.set("entity", filter);
      const res = await fetch(`/api/search?${params}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setSearching(false);
    }, 250);
  }, [query, filter]);

  const showResults = query.trim().length >= 2;
  const configByType = Object.fromEntries(ENTITY_CONFIGS.map((e) => [e.type, e]));

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-[var(--color-accent-warm)] mb-2">
          Health Reference
        </h1>
        <p className="text-[var(--color-muted)] text-sm">
          Functional health practitioner library
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx={11} cy={11} r={8} />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search supplements, symptoms, labs…"
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-border)] shadow-sm"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-muted)] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            filter === "all"
              ? "bg-[var(--color-text)] text-white border-[var(--color-text)]"
              : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"
          }`}
        >
          All
        </button>
        {ENTITY_CONFIGS.map((ec) => (
          <button
            key={ec.type}
            onClick={() => setFilter(ec.type)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filter === ec.type
                ? "bg-[var(--color-text)] text-white border-[var(--color-text)]"
                : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"
            }`}
          >
            {ec.labelPlural}
          </button>
        ))}
      </div>

      {/* Results */}
      {showResults ? (
        <div className="space-y-1">
          {results.length === 0 && !searching ? (
            <p className="text-[var(--color-muted)] text-sm py-4">
              No results found.
            </p>
          ) : (
            results.map((r) => {
              const ec = configByType[r.entity_type];
              return (
                <Link
                  key={`${r.entity_type}-${r.id}`}
                  href={`/${r.entity_type}/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-[var(--color-border)] hover:border-[var(--color-accent-hover)] hover:shadow-sm transition-all group"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${ec?.color ?? "bg-gray-200"}`}
                  />
                  <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-black flex-1">
                    {r.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${ec?.color ?? "bg-gray-100"} ${ec?.textColor ?? "text-gray-700"}`}
                  >
                    {ec?.label ?? r.entity_type}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        /* Category tiles */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ENTITY_CONFIGS.map((ec) => (
            <Link
              key={ec.type}
              href={`/${ec.type}`}
              className="group flex flex-col gap-2 p-5 rounded-xl bg-white border border-[var(--color-border)] hover:shadow-md hover:border-[var(--color-accent-hover)] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className={`w-3 h-3 rounded-full ${ec.color}`} />
                {counts[ec.type] !== undefined && (
                  <span className="text-xs text-[var(--color-muted)]">
                    {counts[ec.type]}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)] group-hover:text-black">
                {ec.labelPlural}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
