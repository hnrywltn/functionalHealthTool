"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EntityConfig, FieldDef } from "@/lib/entities";

function AutoTextarea({ className, value, onChange, placeholder }: {
  className?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
    />
  );
}

type Relationship = {
  relationship_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  relationship_type: string | null;
  notes: string | null;
};

type Tag = { id: string; name: string };
type Attachment = { id: string; label: string; file_key: string; file_type: string };

type Props = {
  config: EntityConfig;
  record: Record<string, unknown> | null;
  relationships: Relationship[];
  initialTags: Tag[];
  initialAttachments: Attachment[];
  allConfigs: EntityConfig[];
};

export default function EntityDetailClient({ config, record, relationships, initialTags, initialAttachments, allConfigs }: Props) {
  const router = useRouter();
  const isNew = record === null;

  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!record) return { name: "" };
    const out: Record<string, string> = { name: String(record.name ?? "") };
    for (const f of config.fields) {
      const val = record[f.key];
      out[f.key] = Array.isArray(val) ? val.join(", ") : String(val ?? "");
    }
    return out;
  });
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [vendorWebsites, setVendorWebsites] = useState<Record<string, string | null>>({});
  const [openVendorPopover, setOpenVendorPopover] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rels, setRels] = useState<Relationship[]>(relationships);
  const [relSearch, setRelSearch] = useState("");
  const [relFilter, setRelFilter] = useState("all");
  const [relResults, setRelResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachPending, setAttachPending] = useState<{ key: string; file_type: string } | null>(null);
  const [attachPendingLabel, setAttachPendingLabel] = useState("");
  const [attachSearch, setAttachSearch] = useState("");
  const [attachResults, setAttachResults] = useState<Attachment[]>([]);
  const [allAttachments, setAllAttachments] = useState<Attachment[]>([]);
  const attachFileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name };
    for (const f of config.fields) {
      if (f.type === "array") {
        body[f.key] = form[f.key]
          ? form[f.key].split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      } else {
        body[f.key] = form[f.key] || null;
      }
    }

    if (isNew) {
      const res = await fetch(`/api/entities/${config.type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      router.push(`/${config.type}/${data.id}`);
    } else {
      await fetch(`/api/entities/${config.type}/${record!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete this ${config.label.toLowerCase()}?`)) return;
    await fetch(`/api/entities/${config.type}/${record!.id}`, { method: "DELETE" });
    router.push(`/${config.type}`);
  }

  async function handleDuplicate() {
    const body: Record<string, unknown> = { name: `Copy of ${form.name}` };
    for (const f of config.fields) {
      if (f.type === "array") {
        body[f.key] = form[f.key]
          ? form[f.key].split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      } else {
        body[f.key] = form[f.key] || null;
      }
    }
    const res = await fetch(`/api/entities/${config.type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    router.push(`/${config.type}/${data.id}?edit=1`);
  }

  async function searchRelated(query: string, filter = relFilter) {
    if (!query.trim()) { setRelResults([]); return; }
    setSearching(true);
    const results: { id: string; name: string; type: string }[] = [];
    const targets = allConfigs.filter((c) =>
      c.type !== config.type && (filter === "all" || c.type === filter)
    );
    await Promise.all(
      targets.map(async (c) => {
        const res = await fetch(`/api/entities/${c.type}`);
        const rows = await res.json();
        const matches = rows.filter((r: { name: string }) =>
          r.name.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matches.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name, type: c.type })));
      })
    );
    setRelResults(results);
    setSearching(false);
  }

  async function addRelationship(relatedType: string, relatedId: string, relatedName: string) {
    const alreadyLinked = rels.some(
      (r) => r.entity_type === relatedType && r.entity_id === relatedId
    );
    if (alreadyLinked) return;

    const res = await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type_a: config.type,
        entity_id_a: record!.id,
        entity_type_b: relatedType,
        entity_id_b: relatedId,
      }),
    });
    const data = await res.json();
    setRels((prev) => [
      ...prev,
      {
        relationship_id: data.id,
        entity_type: relatedType,
        entity_id: relatedId,
        name: relatedName,
        relationship_type: null,
        notes: null,
      },
    ]);
    setRelSearch("");
    setRelResults([]);
  }

  async function removeRelationship(relationshipId: string) {
    await fetch(`/api/relationships?id=${relationshipId}`, { method: "DELETE" });
    setRels((prev) => prev.filter((r) => r.relationship_id !== relationshipId));
  }

  async function loadAllTags() {
    if (allTags.length > 0) return;
    const res = await fetch("/api/tags");
    const data = await res.json();
    setAllTags(data);
  }

  function handleTagInput(value: string) {
    setTagInput(value);
    const normalized = value.toLowerCase().replace(/^#/, "").trim();
    if (!normalized) { setTagSuggestions([]); return; }
    const existing = tags.map((t) => t.id);
    setTagSuggestions(
      allTags.filter(
        (t) => t.name.includes(normalized) && !existing.includes(t.id)
      ).slice(0, 6)
    );
  }

  async function addTag(nameOrTag: string | Tag) {
    if (isNew || !record) return;
    const tag_name = typeof nameOrTag === "string" ? nameOrTag : nameOrTag.name;
    const normalized = tag_name.toLowerCase().replace(/^#/, "").trim();
    if (!normalized) return;
    if (tags.some((t) => t.name === normalized)) { setTagInput(""); setTagSuggestions([]); return; }
    const res = await fetch("/api/entity-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: config.type, entity_id: record.id, tag_name: normalized }),
    });
    const newTag = await res.json();
    setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
    setAllTags((prev) => prev.some((t) => t.id === newTag.id) ? prev : [...prev, newTag]);
    setTagInput("");
    setTagSuggestions([]);
  }

  async function removeTag(tagId: string) {
    if (!record) return;
    await fetch(`/api/entity-tags?entity_type=${config.type}&entity_id=${record.id}&tag_id=${tagId}`, {
      method: "DELETE",
    });
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  function deriveFileType(filename: string): string {
    if (/\.(pdf)$/i.test(filename)) return "pdf";
    if (/\.(png|jpe?g|webp|gif)$/i.test(filename)) return "image";
    return "other";
  }

  async function handleAttachFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAttachUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { key } = await res.json();
    setAttachPending({ key, file_type: deriveFileType(file.name) });
    setAttachPendingLabel(file.name);
    setAttachUploading(false);
  }

  async function saveAttachPending() {
    if (!attachPending || !attachPendingLabel.trim() || !record) return;
    const res = await fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: attachPendingLabel.trim(), file_key: attachPending.key, file_type: attachPending.file_type }),
    });
    const newAttachment: Attachment = await res.json();
    await fetch("/api/entity-attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: config.type, entity_id: record.id, attachment_id: newAttachment.id }),
    });
    setAttachments((prev) => [newAttachment, ...prev]);
    setAttachPending(null);
    setAttachPendingLabel("");
  }

  async function loadAllAttachments() {
    if (allAttachments.length > 0) return;
    const res = await fetch("/api/attachments");
    const data = await res.json();
    setAllAttachments(data);
  }

  function handleAttachSearch(value: string) {
    setAttachSearch(value);
    const q = value.toLowerCase().trim();
    if (!q) { setAttachResults([]); return; }
    const linked = attachments.map((a) => a.id);
    setAttachResults(
      allAttachments.filter((a) => a.label.toLowerCase().includes(q) && !linked.includes(a.id)).slice(0, 6)
    );
  }

  async function linkExistingAttachment(attachment: Attachment) {
    if (!record) return;
    await fetch("/api/entity-attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: config.type, entity_id: record.id, attachment_id: attachment.id }),
    });
    setAttachments((prev) => [attachment, ...prev]);
    setAttachSearch("");
    setAttachResults([]);
  }

  async function unlinkAttachment(attachmentId: string) {
    if (!record) return;
    await fetch(`/api/entity-attachments?entity_type=${config.type}&entity_id=${record.id}&attachment_id=${attachmentId}`, {
      method: "DELETE",
    });
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  async function handleVendorClick(entityId: string) {
    if (openVendorPopover === entityId) { setOpenVendorPopover(null); return; }
    setOpenVendorPopover(entityId);
    if (!(entityId in vendorWebsites)) {
      const res = await fetch(`/api/entities/vendors/${entityId}`);
      const data = await res.json();
      setVendorWebsites((prev) => ({ ...prev, [entityId]: data.website ?? null }));
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") === "1") {
      setEditing(true);
    }
  }, []);

  useEffect(() => {
    if (!openVendorPopover) return;
    function handleClick() { setOpenVendorPopover(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openVendorPopover]);

  // Vendor rels shown in the main section
  const vendorRels = rels.filter((r) => r.entity_type === "vendors");

  // Group non-vendor relationships by entity type for the connections section
  const relsByType = allConfigs
    .filter((c) => c.type !== config.type && c.type !== "vendors")
    .map((c) => ({
      config: c,
      items: rels.filter((r) => r.entity_type === c.type),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Back link */}
      <Link
        href={`/${config.type}`}
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-6 inline-block"
      >
        ← {config.labelPlural}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          {editing ? (
            <input
              className="text-2xl font-semibold text-[var(--color-text)] border-b-2 border-[var(--color-sidebar)] bg-transparent outline-none w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={`${config.label} name`}
              autoFocus
            />
          ) : (
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">
              {String(record?.name ?? "")}
            </h1>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); if (isNew) router.back(); }}
                className="px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-1.5 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-hover)] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDuplicate}
                className="px-4 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-hover)] transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 text-sm text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] mb-8">
        {config.fields.map((field: FieldDef) => (
          <div key={field.key} className="px-5 py-4 grid grid-cols-3 gap-4">
            <dt className="text-sm font-medium text-[var(--color-muted)] pt-0.5">{field.label}</dt>
            <dd className="col-span-2">
              {editing ? (
                field.type !== "text" ? (
                  <AutoTextarea
                    className="w-full text-sm text-[var(--color-text)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:border-[var(--color-sidebar)] transition-colors min-h-[80px] overflow-hidden"
                    value={form[field.key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.type === "array" ? "comma separated" : ""}
                  />
                ) : (
                  <input
                    className="w-full text-sm text-[var(--color-text)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-sidebar)] transition-colors"
                    value={form[field.key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                )
              ) : field.key === "website" && form[field.key] ? (
                <a
                  href={form[field.key].startsWith("http") ? form[field.key] : `https://${form[field.key]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text)] hover:underline break-all"
                >
                  {form[field.key]}
                </a>
              ) : (
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
                  {form[field.key] || (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </p>
              )}
            </dd>
          </div>
        ))}

        {/* Vendors & Pharmacies row — shown inline in the fields card */}
        {!isNew && vendorRels.length > 0 && (
          <div className="px-5 py-4 grid grid-cols-3 gap-4">
            <dt className="text-sm font-medium text-[var(--color-muted)] pt-0.5">Vendors & Pharmacies</dt>
            <dd className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {vendorRels.map((rel) => (
                  <div key={rel.relationship_id} className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleVendorClick(rel.entity_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
                    >
                      {rel.name}
                    </button>
                    {openVendorPopover === rel.entity_id && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 overflow-hidden min-w-[190px]">
                        {vendorWebsites[rel.entity_id] ? (
                          <a
                            href={vendorWebsites[rel.entity_id]!.startsWith("http") ? vendorWebsites[rel.entity_id]! : `https://${vendorWebsites[rel.entity_id]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-background)] text-sm text-[var(--color-text)] transition-colors"
                          >
                            Open website ↗
                          </a>
                        ) : vendorWebsites[rel.entity_id] === null ? null : (
                          <p className="px-4 py-2.5 text-sm text-[var(--color-muted)]">Loading…</p>
                        )}
                        <Link
                          href={`/vendors/${rel.entity_id}`}
                          className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-background)] text-sm text-[var(--color-text)] border-t border-[var(--color-border)] transition-colors"
                        >
                          View in app →
                        </Link>
                        {editing && (
                          <button
                            onClick={() => { removeRelationship(rel.relationship_id); setOpenVendorPopover(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-rose-50 text-sm text-rose-600 border-t border-[var(--color-border)] transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </dd>
          </div>
        )}
      </div>

      {/* Connections — only on saved records */}
      {!isNew && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Connections</h2>

          {/* Existing connections grouped by type */}
          {relsByType.length > 0 ? (
            <div className="space-y-4 mb-6">
              {relsByType.map(({ config: relConfig, items }) => (
                <div key={relConfig.type}>
                  <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-2">
                    {relConfig.labelPlural}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((rel) => (
                      <div
                        key={rel.relationship_id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${relConfig.color} ${relConfig.textColor}`}
                      >
                        <Link
                          href={`/${rel.entity_type}/${rel.entity_id}`}
                          className="hover:underline"
                        >
                          {rel.name}
                        </Link>
                        <button
                          onClick={() => removeRelationship(rel.relationship_id)}
                          className="opacity-50 hover:opacity-100 ml-1 text-xs leading-none"
                          title="Remove connection"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)] mb-6">No connections yet.</p>
          )}

          {/* Add connection */}
          <div>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => { setRelFilter("all"); if (relSearch) searchRelated(relSearch, "all"); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${relFilter === "all" ? "bg-[var(--color-text)] text-white border-[var(--color-text)]" : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"}`}
              >
                All
              </button>
              {allConfigs.filter((c) => c.type !== config.type).map((c) => (
                <button
                  key={c.type}
                  onClick={() => { setRelFilter(c.type); if (relSearch) searchRelated(relSearch, c.type); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${relFilter === c.type ? "bg-[var(--color-text)] text-white border-[var(--color-text)]" : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"}`}
                >
                  {c.labelPlural}
                </button>
              ))}
            </div>
          <div className="relative">
            <input
              className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-sidebar)] transition-colors"
              placeholder="Search to add a connection…"
              value={relSearch}
              onChange={(e) => {
                setRelSearch(e.target.value);
                searchRelated(e.target.value);
              }}
            />
            {(relResults.length > 0 || searching) && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-y-auto max-h-72">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-[var(--color-muted)]">Searching…</p>
                ) : (
                  relResults.slice(0, 8).map((r) => {
                    const rc = allConfigs.find((c) => c.type === r.type)!;
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => addRelationship(r.type, r.id, r.name)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-background)] text-left transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${rc.color}`} />
                        <span className="text-sm font-medium text-[var(--color-text)]">{r.name}</span>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${rc.color} ${rc.textColor}`}>
                          {rc.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          </div>

          {/* Tags */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)]"
                >
                  <Link
                    href={`/tags/${tag.name}`}
                    className="hover:underline"
                  >
                    #{tag.name}
                  </Link>
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="opacity-40 hover:opacity-100 ml-0.5 leading-none"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-sidebar)] transition-colors"
                placeholder="#tag — press Enter to add"
                value={tagInput}
                onFocus={loadAllTags}
                onChange={(e) => handleTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                  if (e.key === "Escape") { setTagInput(""); setTagSuggestions([]); }
                }}
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-hidden">
                  {tagSuggestions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => addTag(t)}
                      className="w-full flex items-center px-4 py-2.5 hover:bg-[var(--color-background)] text-left text-sm text-[var(--color-text)] transition-colors"
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* References */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">References</h3>
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text)] flex-1 truncate">{a.label}</span>
                    <button
                      onClick={() => setPreviewKey(a.file_key)}
                      className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md hover:border-[var(--color-accent-hover)] transition-colors shrink-0"
                    >
                      View
                    </button>
                    <button
                      onClick={() => unlinkAttachment(a.id)}
                      className="text-[var(--color-muted)] hover:text-rose-500 text-lg leading-none shrink-0"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending upload inline form */}
            {attachPending && (
              <div className="mb-3 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg space-y-2">
                <input
                  autoFocus
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-sidebar)] transition-colors bg-white"
                  value={attachPendingLabel}
                  onChange={(e) => setAttachPendingLabel(e.target.value)}
                  placeholder="Label this file…"
                  onKeyDown={(e) => { if (e.key === "Enter") saveAttachPending(); if (e.key === "Escape") { setAttachPending(null); setAttachPendingLabel(""); } }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setAttachPending(null); setAttachPendingLabel(""); }} className="px-3 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">Cancel</button>
                  <button onClick={saveAttachPending} disabled={!attachPendingLabel.trim()} className="px-3 py-1 text-xs bg-[var(--color-sidebar)] text-white rounded-md disabled:opacity-50 transition-colors">Save</button>
                </div>
              </div>
            )}

            {!isNew && (
              <div className="flex gap-2">
                <input ref={attachFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleAttachFileSelect} />
                <button
                  onClick={() => attachFileRef.current?.click()}
                  disabled={attachUploading || !!attachPending}
                  className="px-3 py-1.5 text-xs border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                >
                  {attachUploading ? "Uploading…" : "+ Upload file"}
                </button>
                <div className="relative flex-1">
                  <input
                    className="w-full text-xs border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-sidebar)] transition-colors"
                    placeholder="Or link existing reference…"
                    value={attachSearch}
                    onFocus={loadAllAttachments}
                    onChange={(e) => handleAttachSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setAttachSearch(""); setAttachResults([]); } }}
                  />
                  {attachResults.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-hidden">
                      {attachResults.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => linkExistingAttachment(a)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-background)] text-left text-sm text-[var(--color-text)] transition-colors"
                        >
                          <span className="flex-1 truncate">{a.label}</span>
                          <span className="text-xs text-[var(--color-muted)] shrink-0">{a.file_type.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* File preview modal */}
      {previewKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewKey(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "min(90vw, 960px)", height: "min(90vh, 800px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium text-[var(--color-text)] truncate">
                {previewKey.split("/").pop()}
              </span>
              <button
                onClick={() => setPreviewKey(null)}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none ml-4 shrink-0"
              >
                ×
              </button>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(previewKey) ? (
              <div className="flex items-center justify-center h-[calc(100%-49px)] bg-[var(--color-background)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${previewKey}`}
                  alt={previewKey.split("/").pop()}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={`/api/files/${previewKey}`}
                className="w-full"
                style={{ height: "calc(100% - 49px)" }}
                title={previewKey.split("/").pop()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
