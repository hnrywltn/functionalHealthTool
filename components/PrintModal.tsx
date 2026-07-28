"use client";

import { useState } from "react";
import jsPDF from "jspdf";
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

  function handleDownloadPdf() {
    const checkedItems = items.filter((i) => i.checked);

    type Section = {
      label: string;
      lines: string[];
      subGroups?: { label: string; text: string }[];
      note?: string;
    };

    const sections: Section[] = [];

    for (const item of checkedItems) {
      if (item.id === "connections") {
        const grouped = allConfigs
          .filter((c) => c.type !== config.type && c.type !== "vendors")
          .map((c) => ({
            label: c.labelPlural,
            rels: nonVendorRels.filter((r) => r.entity_type === c.type),
          }))
          .filter((g) => g.rels.length > 0);

        if (grouped.length === 0 && !item.note.trim()) continue;

        sections.push({
          label: item.label,
          lines: [],
          subGroups: grouped.map((g) => ({
            label: g.label,
            text: g.rels.map((r) => r.name).join(" · "),
          })),
          note: item.note.trim() || undefined,
        });
      } else if (item.id === "tags") {
        if (tags.length === 0 && !item.note.trim()) continue;
        sections.push({
          label: item.label,
          lines: [tags.map((t) => `#${t.name}`).join("   ")],
          note: item.note.trim() || undefined,
        });
      } else {
        if (!item.content && !item.note.trim()) continue;
        sections.push({
          label: item.label,
          lines: item.content ? item.content.split("\n") : [],
          note: item.note.trim() || undefined,
        });
      }
    }

    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    function ensureSpace(height: number) {
      if (y + height > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    function sanitizeForPdf(text: string): string {
      return text
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...")
        .replace(/ /g, " ")
        .replace(/[•●]/g, "-");
    }

    function drawWrapped(
      text: string,
      size: number,
      style: "normal" | "bold",
      color: [number, number, number],
      lineHeight: number,
      gapAfter = 0
    ) {
      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
      const lines: string[] = pdf.splitTextToSize(sanitizeForPdf(text), contentWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        pdf.text(line, margin, y);
        y += lineHeight;
      }
      y += gapAfter;
    }

    function drawDivider(color: [number, number, number], width: number, gapAfter: number) {
      ensureSpace(gapAfter);
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(width);
      pdf.line(margin, y, pageWidth - margin, y);
      y += gapAfter;
    }

    drawWrapped(recordName, 20, "bold", [17, 17, 17], 24);
    drawWrapped(config.label.toUpperCase(), 9, "bold", [136, 136, 136], 12, 8);
    drawDivider([224, 224, 224], 1.2, 20);

    sections.forEach((section, idx) => {
      if (idx > 0) {
        drawDivider([229, 229, 229], 0.75, 16);
      }

      drawWrapped(section.label.toUpperCase(), 9, "bold", [136, 136, 136], 12, 4);

      if (section.subGroups) {
        section.subGroups.forEach((g) => {
          drawWrapped(g.label.toUpperCase(), 8, "bold", [170, 170, 170], 11, 2);
          drawWrapped(g.text, 11, "normal", [51, 51, 51], 15, 6);
        });
      } else if (section.lines.length > 0) {
        section.lines.forEach((line) => {
          drawWrapped(line || " ", 11, "normal", [34, 34, 34], 16);
        });
      }

      if (section.note) {
        y += 4;
        drawWrapped(section.note, 10, "normal", [85, 85, 85], 14);
      }
    });

    y += 20;
    drawDivider([238, 238, 238], 0.75, 16);
    drawWrapped(`Health Reference · ${date}`, 9, "normal", [187, 187, 187], 12);

    pdf.save(`${recordName}.pdf`);
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
              Download PDF
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
            onClick={handleDownloadPdf}
            className="px-5 py-2 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
