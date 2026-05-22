"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EntityConfig } from "@/lib/entities";

type Relationship = {
  relationship_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
};

type Tag = { id: string; name: string };
type Attachment = { id: string; label: string; file_key: string; file_type: string };

type PrintItem = {
  id: string;
  label: string;
  checked: boolean;
  note: string;
  content: string;
  isEmpty: boolean;
};

type Props = {
  config: EntityConfig;
  recordName: string;
  form: Record<string, string>;
  rels: Relationship[];
  tags: Tag[];
  attachments: Attachment[];
  allConfigs: EntityConfig[];
  onClose: () => void;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
      <circle cx="3" cy="3" r="1.5" />
      <circle cx="7" cy="3" r="1.5" />
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="7" cy="8" r="1.5" />
      <circle cx="3" cy="13" r="1.5" />
      <circle cx="7" cy="13" r="1.5" />
    </svg>
  );
}

function SortableItem({
  item,
  onChange,
}: {
  item: PrintItem;
  onChange: (updates: Partial<PrintItem>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="bg-white border border-[var(--color-border)] rounded-lg">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            {...attributes}
            {...listeners}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-grab active:cursor-grabbing shrink-0 touch-none"
          >
            <GripIcon />
          </button>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => onChange({ checked: e.target.checked })}
            className="w-4 h-4 rounded shrink-0"
          />
          <span className="text-sm font-medium text-[var(--color-text)] flex-1">{item.label}</span>
          {item.isEmpty && (
            <span className="text-xs text-[var(--color-muted)]">empty</span>
          )}
        </div>
        {item.checked && (
          <div className="px-3 pb-3 border-t border-[var(--color-border)] pt-2.5">
            <textarea
              className="w-full text-sm text-[var(--color-text)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:border-[var(--color-sidebar)] transition-colors placeholder:text-[var(--color-muted)]"
              placeholder="Add a note for this section…"
              value={item.note}
              onChange={(e) => onChange({ note: e.target.value })}
              rows={2}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintModal({
  config,
  recordName,
  form,
  rels,
  tags,
  attachments,
  allConfigs,
  onClose,
}: Props) {
  const vendorRels = rels.filter((r) => r.entity_type === "vendors");
  const nonVendorRels = rels.filter((r) => r.entity_type !== "vendors");

  const [items, setItems] = useState<PrintItem[]>(() => {
    const out: PrintItem[] = [];

    for (const field of config.fields) {
      const value = form[field.key] ?? "";
      out.push({
        id: `field_${field.key}`,
        label: field.label,
        checked: !!value,
        note: "",
        content: value,
        isEmpty: !value,
      });
    }

    if (vendorRels.length > 0) {
      out.push({
        id: "vendors",
        label: "Vendors & Pharmacies",
        checked: true,
        note: "",
        content: vendorRels.map((r) => r.name).join(", "),
        isEmpty: false,
      });
    }

    out.push({
      id: "connections",
      label: "Connections",
      checked: nonVendorRels.length > 0,
      note: "",
      content: "",
      isEmpty: nonVendorRels.length === 0,
    });

    out.push({
      id: "tags",
      label: "Tags",
      checked: tags.length > 0,
      note: "",
      content: tags.map((t) => `#${t.name}`).join("  "),
      isEmpty: tags.length === 0,
    });

    if (attachments.length > 0) {
      out.push({
        id: "references",
        label: "References",
        checked: true,
        note: "",
        content: attachments.map((a) => a.label).join("\n"),
        isEmpty: false,
      });
    }

    return out;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function updateItem(id: string, updates: Partial<PrintItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  const allChecked = items.every((i) => i.checked);

  function toggleAll() {
    const next = !allChecked;
    setItems((prev) => prev.map((i) => ({ ...i, checked: next })));
  }

  function handlePrint() {
    const checkedItems = items.filter((i) => i.checked);

    const sectionsHtml = checkedItems
      .map((item, idx) => {
        let contentHtml = "";

        if (item.id === "connections") {
          const grouped = allConfigs
            .filter((c) => c.type !== config.type && c.type !== "vendors")
            .map((c) => ({
              label: c.labelPlural,
              rels: nonVendorRels.filter((r) => r.entity_type === c.type),
            }))
            .filter((g) => g.rels.length > 0);

          if (grouped.length === 0 && !item.note.trim()) return "";

          contentHtml = grouped
            .map(
              (g) => `
            <div class="conn-group">
              <div class="conn-label">${escapeHtml(g.label)}</div>
              <div class="conn-items">${g.rels.map((r) => escapeHtml(r.name)).join(" · ")}</div>
            </div>`
            )
            .join("");
        } else if (item.id === "tags") {
          if (tags.length === 0 && !item.note.trim()) return "";
          contentHtml = `<div class="tags">${tags
            .map((t) => `<span class="tag">#${escapeHtml(t.name)}</span>`)
            .join("")}</div>`;
        } else {
          if (!item.content && !item.note.trim()) return "";
          contentHtml = item.content
            ? `<div class="content">${escapeHtml(item.content).replace(/\n/g, "<br>")}</div>`
            : "";
        }

        const noteHtml = item.note.trim()
          ? `<div class="note">${escapeHtml(item.note.trim()).replace(/\n/g, "<br>")}</div>`
          : "";

        if (!contentHtml && !noteHtml) return "";

        const divider = idx > 0 ? '<div class="divider"></div>' : "";
        return `${divider}<div class="section"><div class="section-label">${escapeHtml(item.label)}</div>${contentHtml}${noteHtml}</div>`;
      })
      .join("");

    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(recordName)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 680px;
  margin: 40px auto;
  padding: 0 24px;
  color: #111;
  line-height: 1.6;
}
.header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e0e0e0; }
.record-name { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
.entity-type { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
.section { }
.section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 6px; }
.content { font-size: 14px; white-space: pre-wrap; color: #222; }
.conn-group { margin-bottom: 8px; }
.conn-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin-bottom: 3px; }
.conn-items { font-size: 13px; color: #333; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 12px; padding: 2px 10px; background: #f0f0f0; border-radius: 999px; color: #555; }
.divider { border-top: 1px solid #e5e5e5; margin: 20px 0; }
.note { margin-top: 10px; font-size: 13px; color: #555; border-left: 3px solid #ddd; padding-left: 12px; white-space: pre-wrap; }
.footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #bbb; }
@media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="record-name">${escapeHtml(recordName)}</div>
  <div class="entity-type">${escapeHtml(config.label)}</div>
</div>
${sectionsHtml}
<div class="footer">Health Reference · ${date}</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-background)] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Print / Save PDF
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">{recordName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-2xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Instructions + select all */}
        <div className="px-6 pt-4 pb-2 shrink-0 flex items-center justify-between">
          <p className="text-xs text-[var(--color-muted)]">
            Check sections to include · drag to reorder · add notes below each section
          </p>
          <button
            onClick={toggleAll}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors shrink-0 ml-4"
          >
            {allChecked ? "Uncheck all" : "Check all"}
          </button>
        </div>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onChange={(updates) => updateItem(item.id, updates)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
