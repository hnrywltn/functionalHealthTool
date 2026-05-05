"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENTITY_CONFIGS } from "@/lib/entities";

type RecordStub = { id: string; name: string };

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, RecordStub[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  if (pathname === "/") return null;

  async function toggleExpand(entityType: string) {
    if (expanded === entityType) {
      setExpanded(null);
      return;
    }
    setExpanded(entityType);
    if (!records[entityType]) {
      setLoading(entityType);
      const res = await fetch(`/api/entities/${entityType}`);
      const data = await res.json();
      setRecords((prev) => ({ ...prev, [entityType]: data }));
      setLoading(null);
    }
  }

  return (
    <aside className="w-56 shrink-0 bg-[var(--color-sidebar)] min-h-screen flex flex-col">
      <Link href="/" className="px-5 py-6 border-b border-white/10 block hover:bg-white/5 transition-colors">
        <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
          Health Reference
        </p>
      </Link>
      <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto">
        <div className="space-y-0.5 flex-1">
          {ENTITY_CONFIGS.map((entity) => {
            const active = pathname.startsWith(`/${entity.type}`);
            const isExpanded = expanded === entity.type;
            const isLoading = loading === entity.type;
            const list = records[entity.type] ?? [];

            return (
              <div key={entity.type}>
                <div className={`flex items-center rounded-lg text-sm transition-colors ${active ? "bg-white/15 text-white font-medium" : "text-white/60 hover:text-white hover:bg-white/8"}`}>
                  <Link
                    href={`/${entity.type}`}
                    className="flex items-center gap-3 px-3 py-2 flex-1 min-w-0"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${entity.color}`} />
                    <span className="truncate">{entity.labelPlural}</span>
                  </Link>
                  <button
                    onClick={() => toggleExpand(entity.type)}
                    className="px-2 py-2 opacity-40 hover:opacity-100 transition-opacity shrink-0"
                    title={isExpanded ? "Collapse" : "Browse"}
                  >
                    <svg
                      className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 mb-1 max-h-52 overflow-y-auto rounded-lg border border-white/10">
                    {isLoading ? (
                      <p className="px-3 py-2 text-xs text-white/30">Loading…</p>
                    ) : list.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-white/30">None yet</p>
                    ) : (
                      list.map((r) => (
                        <Link
                          key={r.id}
                          href={`/${entity.type}/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors truncate"
                        >
                          {r.name}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 space-y-0.5">
          <Link
            href="/references"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith("/references")
                ? "bg-white/15 text-white font-medium"
                : "text-white/60 hover:text-white hover:bg-white/8"
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0 bg-white/40" />
            References
          </Link>
        </div>
      </nav>
    </aside>
  );
}
