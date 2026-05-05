"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { EntityConfig } from "@/lib/entities";

type LinkedEntity = {
  entity_type: string;
  entity_id: string;
  name: string;
  config: EntityConfig;
};

type Attachment = {
  id: string;
  label: string;
  file_key: string;
  file_type: string;
  entities: LinkedEntity[];
};

type Props = {
  initialAttachments: Attachment[];
  allConfigs: EntityConfig[];
};

function fileTypeLabel(t: string) {
  if (t === "pdf") return "PDF";
  if (t === "image") return "Image";
  return "File";
}

function deriveFileType(filename: string): string {
  if (/\.(pdf)$/i.test(filename)) return "pdf";
  if (/\.(png|jpe?g|webp|gif)$/i.test(filename)) return "image";
  return "other";
}

export default function ReferencesClient({ initialAttachments, allConfigs }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ key: string; file_type: string; defaultLabel: string } | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const [entityResults, setEntityResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [pendingLinks, setPendingLinks] = useState<LinkedEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const grouped: Record<string, Attachment[]> = {};
  for (const a of attachments) {
    if (!grouped[a.file_type]) grouped[a.file_type] = [];
    grouped[a.file_type].push(a);
  }
  const typeOrder = ["pdf", "image", "other"];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { key } = await res.json();
    const ft = deriveFileType(file.name);
    setPending({ key, file_type: ft, defaultLabel: file.name });
    setPendingLabel(file.name);
    setPendingLinks([]);
    setEntitySearch("");
    setEntityResults([]);
    setUploading(false);
  }

  async function searchEntities(query: string) {
    if (!query.trim()) { setEntityResults([]); return; }
    setSearching(true);
    const results: { id: string; name: string; type: string }[] = [];
    await Promise.all(
      allConfigs.map(async (c) => {
        const res = await fetch(`/api/entities/${c.type}`);
        const rows = await res.json();
        const matches = rows.filter((r: { name: string }) =>
          r.name.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matches.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name, type: c.type })));
      })
    );
    setEntityResults(results);
    setSearching(false);
  }

  function togglePendingLink(result: { id: string; name: string; type: string }) {
    const config = allConfigs.find((c) => c.type === result.type)!;
    const already = pendingLinks.some((l) => l.entity_id === result.id && l.entity_type === result.type);
    if (already) {
      setPendingLinks((prev) => prev.filter((l) => !(l.entity_id === result.id && l.entity_type === result.type)));
    } else {
      setPendingLinks((prev) => [...prev, { entity_type: result.type, entity_id: result.id, name: result.name, config }]);
    }
  }

  async function savePending() {
    if (!pending || !pendingLabel.trim()) return;
    const res = await fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: pendingLabel.trim(), file_key: pending.key, file_type: pending.file_type }),
    });
    const newAttachment: Attachment = { ...(await res.json()), entities: pendingLinks };
    await Promise.all(
      pendingLinks.map((l) =>
        fetch("/api/entity-attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity_type: l.entity_type, entity_id: l.entity_id, attachment_id: newAttachment.id }),
        })
      )
    );
    setAttachments((prev) => [newAttachment, ...prev]);
    setPending(null);
    setPendingLabel("");
    setPendingLinks([]);
    setEntitySearch("");
    setEntityResults([]);
  }

  async function deleteAttachment(id: string) {
    if (!confirm("Remove this reference?")) return;
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/attachments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: renameValue.trim() }),
    });
    setAttachments((prev) => prev.map((a) => a.id === id ? { ...a, label: renameValue.trim() } : a));
    setRenamingId(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">References</h1>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !!pending}
            className="px-4 py-2 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading…" : "+ Upload file"}
          </button>
        </div>
      </div>

      {/* Pending upload form */}
      {pending && (
        <div className="mb-8 p-5 bg-white border-2 border-[var(--color-sidebar)] rounded-xl space-y-4">
          <p className="text-sm font-medium text-[var(--color-text)]">New reference</p>
          <input
            autoFocus
            className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-sidebar)] transition-colors"
            value={pendingLabel}
            onChange={(e) => setPendingLabel(e.target.value)}
            placeholder="Label this file…"
            onKeyDown={(e) => { if (e.key === "Enter") savePending(); if (e.key === "Escape") setPending(null); }}
          />

          {/* Link to records */}
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-2">Link to records (optional)</p>
            {pendingLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {pendingLinks.map((l) => (
                  <span key={`${l.entity_type}-${l.entity_id}`} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${l.config.color} ${l.config.textColor}`}>
                    {l.name}
                    <button onClick={() => togglePendingLink({ id: l.entity_id, name: l.name, type: l.entity_type })} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-sidebar)] transition-colors"
                placeholder="Search records to link…"
                value={entitySearch}
                onChange={(e) => { setEntitySearch(e.target.value); searchEntities(e.target.value); }}
              />
              {(entityResults.length > 0 || searching) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-y-auto max-h-56">
                  {searching ? (
                    <p className="px-4 py-3 text-sm text-[var(--color-muted)]">Searching…</p>
                  ) : (
                    entityResults.slice(0, 8).map((r) => {
                      const rc = allConfigs.find((c) => c.type === r.type)!;
                      const linked = pendingLinks.some((l) => l.entity_id === r.id && l.entity_type === r.type);
                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          onClick={() => togglePendingLink(r)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-background)] text-left transition-colors ${linked ? "opacity-50" : ""}`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${rc.color}`} />
                          <span className="text-sm text-[var(--color-text)]">{r.name}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${rc.color} ${rc.textColor}`}>{rc.label}</span>
                          {linked && <span className="text-xs text-[var(--color-muted)]">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setPending(null); setPendingLabel(""); setPendingLinks([]); }} className="px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">Cancel</button>
            <button onClick={savePending} disabled={!pendingLabel.trim()} className="px-4 py-1.5 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] disabled:opacity-50 transition-colors">Save</button>
          </div>
        </div>
      )}

      {attachments.length === 0 && !pending && (
        <p className="text-sm text-[var(--color-muted)]">No references yet. Upload a file to get started.</p>
      )}

      {typeOrder.filter((t) => grouped[t]?.length).map((ft) => (
        <div key={ft} className="mb-8">
          <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-3">{fileTypeLabel(ft)}s</p>
          <div className="space-y-3">
            {grouped[ft].map((a) => (
              <div key={a.id} className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {renamingId === a.id ? (
                      <input
                        autoFocus
                        className="w-full text-sm font-medium border-b border-[var(--color-sidebar)] outline-none bg-transparent pb-0.5"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => saveRename(a.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(a.id); if (e.key === "Escape") setRenamingId(null); }}
                      />
                    ) : (
                      <button
                        className="text-sm font-medium text-[var(--color-text)] hover:underline text-left truncate max-w-full"
                        onClick={() => { setRenamingId(a.id); setRenameValue(a.label); }}
                        title="Click to rename"
                      >
                        {a.label}
                      </button>
                    )}
                    {a.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {a.entities.map((e) => (
                          <Link
                            key={`${e.entity_type}-${e.entity_id}`}
                            href={`/${e.entity_type}/${e.entity_id}`}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.config.color} ${e.config.textColor} hover:opacity-80 transition-opacity`}
                          >
                            {e.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/api/files/${a.file_key}`}
                      target="_blank"
                      className="px-3 py-1 text-xs border border-[var(--color-border)] rounded-md hover:border-[var(--color-accent-hover)] transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteAttachment(a.id)}
                      className="text-[var(--color-muted)] hover:text-rose-500 text-lg leading-none transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
