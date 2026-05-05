export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import pool from "@/lib/db";
import { ENTITY_CONFIGS } from "@/lib/entities";

type Params = { params: Promise<{ name: string }> };

export default async function TagPage({ params }: Params) {
  const { name } = await params;
  const normalized = name.toLowerCase().replace(/^#/, "");

  const { rows: tagRows } = await pool.query(
    `SELECT id, name FROM tags WHERE name = $1`,
    [normalized]
  );
  if (!tagRows[0]) notFound();
  const tag = tagRows[0];

  const { rows: etRows } = await pool.query(
    `SELECT entity_type, entity_id FROM entity_tags WHERE tag_id = $1`,
    [tag.id]
  );

  // Enrich with names, grouped by entity type
  const grouped: Record<string, { id: string; name: string }[]> = {};
  await Promise.all(
    etRows.map(async (et) => {
      const { rows } = await pool.query(
        `SELECT id, name FROM ${et.entity_type} WHERE id = $1`,
        [et.entity_id]
      );
      if (!rows[0]) return;
      if (!grouped[et.entity_type]) grouped[et.entity_type] = [];
      grouped[et.entity_type].push({ id: rows[0].id, name: rows[0].name });
    })
  );

  const totalCount = etRows.length;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-6 inline-block"
      >
        ← Home
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">#{tag.name}</h1>
        <span className="text-sm text-[var(--color-muted)]">{totalCount} {totalCount === 1 ? "record" : "records"}</span>
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No records tagged yet.</p>
      ) : (
        <div className="space-y-6">
          {ENTITY_CONFIGS.filter((c) => grouped[c.type]?.length).map((c) => (
            <div key={c.type}>
              <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-2">
                {c.labelPlural}
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped[c.type].map((r) => (
                  <Link
                    key={r.id}
                    href={`/${c.type}/${r.id}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${c.color} ${c.textColor} hover:opacity-80 transition-opacity`}
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
