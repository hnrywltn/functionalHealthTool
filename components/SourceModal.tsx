"use client";

import { useEffect, useState } from "react";
import { EntityConfig } from "@/lib/entities";

export type SourceValue = {
  type: "text";
  text: string;
} | {
  type: "entity";
  entity_type: string;
  entity_id: string;
  name: string;
};

type Props = {
  label: string;
  sourceEntityTypes: string[];
  allConfigs: EntityConfig[];
  initialValue: SourceValue | null;
  onSave: (value: SourceValue | null) => void;
  onClose: () => void;
};

export function parseSourceValue(raw: string | null | undefined): SourceValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === "entity" || parsed.type === "text") return parsed;
    return null;
  } catch {
    return { type: "text", text: raw };
  }
}

export function serializeSourceValue(value: SourceValue | null): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

export default function SourceModal({ label, sourceEntityTypes, allConfigs, initialValue, onSave, onClose }: Props) {
  const [mode, setMode] = useState<"text" | "entity">(initialValue?.type ?? "text");
  const [text, setText] = useState(initialValue?.type === "text" ? initialValue.text : "");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ entity_type: string; entity_id: string; name: string } | null>(
    initialValue?.type === "entity" ? { entity_type: initialValue.entity_type, entity_id: initialValue.entity_id, name: initialValue.name } : null
  );

  async function doSearch(query: string) {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const all: { id: string; name: string; type: string }[] = [];
    await Promise.all(
      sourceEntityTypes.map(async (entityType) => {
        const res = await fetch(`/api/entities/${entityType}`);
        const rows = await res.json();
        const matches = rows.filter((r: { name: string }) =>
          r.name.toLowerCase().includes(query.toLowerCase())
        );
        all.push(...matches.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name, type: entityType })));
      })
    );
    setResults(all);
    setSearching(false);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSave() {
    if (mode === "text") {
      if (!text.trim()) { onSave(null); } else { onSave({ type: "text", text: text.trim() }); }
    } else {
      if (!selected) { onSave(null); } else { onSave({ type: "entity", entity_type: selected.entity_type, entity_id: selected.entity_id, name: selected.name }); }
    }
    onClose();
  }

  function handleClear() {
    onSave(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text)]">{label}</h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("text")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "text" ? "bg-[var(--color-sidebar)] text-white" : "bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}
            >
              Enter text
            </button>
            <button
              onClick={() => setMode("entity")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "entity" ? "bg-[var(--color-sidebar)] text-white" : "bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}
            >
              Select record
            </button>
          </div>

          {mode === "text" ? (
            <textarea
              autoFocus
              className="w-full text-sm text-[var(--color-text)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:border-[var(--color-sidebar)] transition-colors min-h-[80px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a source…"
            />
          ) : (
            <div className="space-y-3">
              {selected && (
                <div className="flex items-center gap-2 p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
                  {(() => {
                    const c = allConfigs.find((cfg) => cfg.type === selected.entity_type);
                    return c ? <span className={`w-2 h-2 rounded-full shrink-0 ${c.color}`} /> : null;
                  })()}
                  <span className="text-sm font-medium text-[var(--color-text)] flex-1">{selected.name}</span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {allConfigs.find((c) => c.type === selected.entity_type)?.label}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-[var(--color-muted)] hover:text-rose-500 text-lg leading-none ml-2">×</button>
                </div>
              )}

              <div className="relative">
                <input
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-sidebar)] transition-colors"
                  placeholder="Search laboratories, vendors…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); doSearch(e.target.value); }}
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-y-auto max-h-48">
                    {searching ? (
                      <p className="px-4 py-3 text-sm text-[var(--color-muted)]">Searching…</p>
                    ) : (
                      results.slice(0, 8).map((r) => {
                        const rc = allConfigs.find((c) => c.type === r.type);
                        return (
                          <button
                            key={`${r.type}-${r.id}`}
                            onClick={() => { setSelected({ entity_type: r.type, entity_id: r.id, name: r.name }); setSearch(""); setResults([]); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-background)] text-left transition-colors"
                          >
                            {rc && <span className={`w-2 h-2 rounded-full shrink-0 ${rc.color}`} />}
                            <span className="text-sm font-medium text-[var(--color-text)]">{r.name}</span>
                            {rc && (
                              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${rc.color} ${rc.textColor}`}>
                                {rc.label}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleClear}
            className="text-sm text-[var(--color-muted)] hover:text-rose-500 transition-colors"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
