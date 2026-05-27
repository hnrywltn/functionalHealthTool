"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENTITY_CONFIGS } from "@/lib/entities";

type RecordStub = { id: string; name: string };

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 224;

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, RecordStub[]>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedWidth) setWidth(parseInt(savedWidth));
    if (savedCollapsed) setCollapsed(savedCollapsed === "true");
  }, []);

  if (pathname === "/") return null;

  async function toggleExpand(entityType: string) {
    if (expanded === entityType) { setExpanded(null); return; }
    setExpanded(entityType);
    if (!records[entityType]) {
      setLoading(entityType);
      const res = await fetch(`/api/entities/${entityType}`);
      const data = await res.json();
      setRecords((prev) => ({ ...prev, [entityType]: data }));
      setLoading(null);
    }
  }

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    }

    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        localStorage.setItem("sidebarWidth", String(w));
        return w;
      });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  }

  if (collapsed) {
    return (
      <aside className="shrink-0 bg-[var(--color-sidebar)] min-h-screen flex flex-col items-center pt-5" style={{ width: 48 }}>
        <button
          onClick={toggleCollapse}
          title="Expand sidebar"
          className="text-white/30 hover:text-white transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="shrink-0 bg-[var(--color-sidebar)] min-h-screen flex flex-col relative"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center border-b border-white/10 shrink-0">
        <Link href="/" className="flex-1 px-5 py-6 block hover:bg-white/5 transition-colors min-w-0">
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium truncate">
            Health Reference
          </p>
        </Link>
        <button
          onClick={toggleCollapse}
          title="Collapse sidebar"
          className="px-3 py-6 text-white/20 hover:text-white/60 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Nav */}
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

      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="absolute top-0 right-0 w-1 h-full hover:bg-white/20 transition-colors"
        style={{ cursor: "col-resize" }}
      />
    </aside>
  );
}
