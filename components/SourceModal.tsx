"use client";

import { useEffect, useState } from "react";
import { EntityConfig } from "@/lib/entities";

export type SourceLink = {
  text: string;
  url?: string;
};

export type SourceValue = {
  type: "text";
  links: SourceLink[];
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
    if (parsed.type === "entity") return parsed;
    if (parsed.type === "text") {
      if (Array.isArray(parsed.links)) return { type: "text", links: parsed.links };
      // legacy single text/url shape
      return { type: "text", links: [{ text: parsed.text ?? "", url: parsed.url }] };
    }
    return null;
  } catch {
    return { type: "text", links: [{ text: raw }] };
  }
}

export function serializeSourceValue(value: SourceValue | null): string | null {
  if (!value) return null;
  if (value.type === "text") {
    const links = value.links
      .map((l) => ({ text: l.text.trim(), url: (l.url ?? "").trim() || undefined }))
      .filter((l) => l.text || l.url);
    if (links.length === 0) return null;
    return JSON.stringify({ type: "text", links });
  }
  return JSON.stringify(value);
}

export default function SourceModal({ label, sourceEntityTypes, allConfigs, initialValue, onSave, onClose }: Props) {
  const [mode, setMode] = useState<"text" | "entity">(initialValue?.type ?? "text");
  const [links, setLinks] = useState<SourceLink[]>(
    initialValue?.type === "text" && initialValue.links.length > 0
      ? initialValue.links.map((l) => ({ text: l.text, url: l.url ?? "" }))
      : [{ text: "", url: "" }]
  );
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
      const cleaned = links
        .map((l) => ({ text: l.text.trim(), url: (l.url ?? "").trim() || undefined }))
        .filter((l) => l.text || l.url);
      if (cleaned.length === 0) { onSave(null); } else { onSave({ type: "text", links: cleaned }); }
    } else {
      if (!selected) { onSave(null); } else { onSave({ type: "entity", entity_type: selected.entity_type, entity_id: selected.entity_id, name: selected.name }); }
    }
    onClose();
  }

  function handleClear() {
    onSave(null);
    onClose();
  }

  function updateLink(i: number, field: "text" | "url", value: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLink() {
    setLinks((prev) => [...prev, { text: "", url: "" }]);
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
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
            <div className="space-y-3">
              {links.map((link, i) => (
                <div
                  key={i}
                  className="relative p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg space-y-2"
                >
                  {links.length > 1 && (
                    <button
                      onClick={() => removeLink(i)}
                      className="absolute top-2 right-2 text-[var(--color-muted)] hover:text-rose-500 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                  <textarea
                    autoFocus={i === 0}
                    className="w-full text-sm text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:border-[var(--color-sidebar)] transition-colors min-h-[40px] pr-6"
                    value={link.text}
                    onChange={(e) => updateLink(i, "text", e.target.value)}
                    placeholder="Type a source…"
                  />
                  <input
                    type="text"
                    className="w-full text-sm text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-sidebar)] transition-colors"
                    value={link.url ?? ""}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                    placeholder="Link (optional) — https://…"
                  />
                </div>
              ))}
              <button
                onClick={addLink}
                className="text-sm text-[var(--color-sidebar)] hover:underline"
              >
                + Add another link
              </button>
            </div>
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
