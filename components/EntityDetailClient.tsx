"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EntityConfig, FieldDef } from "@/lib/entities";

type Relationship = {
  relationship_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  relationship_type: string | null;
  notes: string | null;
};

type Props = {
  config: EntityConfig;
  record: Record<string, unknown> | null;
  relationships: Relationship[];
  allConfigs: EntityConfig[];
};

export default function EntityDetailClient({ config, record, relationships, allConfigs }: Props) {
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
  const [fileValues, setFileValues] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const f of config.fields) {
      if (f.type === "file") {
        const val = record?.[f.key];
        out[f.key] = Array.isArray(val) ? (val as string[]) : [];
      }
    }
    return out;
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [saving, setSaving] = useState(false);
  const [rels, setRels] = useState<Relationship[]>(relationships);
  const [relSearch, setRelSearch] = useState("");
  const [relResults, setRelResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name };
    for (const f of config.fields) {
      if (f.type === "file") {
        body[f.key] = fileValues[f.key] ?? [];
      } else if (f.type === "array") {
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

  async function searchRelated(query: string) {
    if (!query.trim()) { setRelResults([]); return; }
    setSearching(true);
    const results: { id: string; name: string; type: string }[] = [];
    await Promise.all(
      allConfigs
        .filter((c) => c.type !== config.type)
        .map(async (c) => {
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

  async function handleFileUpload(fieldKey: string, file: File) {
    setUploading((u) => ({ ...u, [fieldKey]: true }));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { key } = await res.json();
    setFileValues((fv) => ({ ...fv, [fieldKey]: [...(fv[fieldKey] ?? []), key] }));
    setUploading((u) => ({ ...u, [fieldKey]: false }));
  }

  function removeFile(fieldKey: string, key: string) {
    setFileValues((fv) => ({ ...fv, [fieldKey]: fv[fieldKey].filter((k) => k !== key) }));
  }

  // Group relationships by entity type
  const relsByType = allConfigs
    .filter((c) => c.type !== config.type)
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
              {field.type === "file" ? (
                <div className="space-y-2">
                  {(fileValues[field.key] ?? []).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <a
                        href={`/api/files/${key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--color-text)] hover:underline truncate"
                      >
                        {key.split("/").pop()}
                      </a>
                      {editing && (
                        <button
                          onClick={() => removeFile(field.key, key)}
                          className="text-[var(--color-muted)] hover:text-rose-500 text-lg leading-none shrink-0"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <>
                      <input
                        ref={(el) => { fileInputRefs.current[field.key] = el; }}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field.key, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[field.key]?.click()}
                        disabled={uploading[field.key]}
                        className="text-sm px-3 py-1.5 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                      >
                        {uploading[field.key] ? "Uploading…" : "+ Add file"}
                      </button>
                    </>
                  )}
                  {!editing && (fileValues[field.key] ?? []).length === 0 && (
                    <span className="text-sm text-[var(--color-muted)]">—</span>
                  )}
                </div>
              ) : editing ? (
                field.type !== "text" ? (
                  <textarea
                    className="w-full text-sm text-[var(--color-text)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:border-[var(--color-sidebar)] transition-colors min-h-[80px]"
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
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-10 overflow-hidden">
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
        </section>
      )}
    </div>
  );
}
