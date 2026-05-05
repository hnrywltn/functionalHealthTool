export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ENTITY_CONFIGS } from "@/lib/entities";

type Params = { params: Promise<{ name: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { name } = await params;
  const normalized = name.toLowerCase().replace(/^#/, "");

  const { rows: tagRows } = await pool.query(
    `SELECT id, name FROM tags WHERE name = $1`,
    [normalized]
  );
  if (!tagRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tag = tagRows[0];

  const { rows: etRows } = await pool.query(
    `SELECT entity_type, entity_id FROM entity_tags WHERE tag_id = $1`,
    [tag.id]
  );

  // Enrich with names, grouped by entity type
  const grouped: Record<string, { id: string; name: string }[]> = {};
  await Promise.all(
    etRows.map(async (et) => {
      const config = ENTITY_CONFIGS.find((c) => c.type === et.entity_type);
      if (!config) return;
      const { rows } = await pool.query(
        `SELECT id, name FROM ${et.entity_type} WHERE id = $1`,
        [et.entity_id]
      );
      if (!rows[0]) return;
      if (!grouped[et.entity_type]) grouped[et.entity_type] = [];
      grouped[et.entity_type].push({ id: rows[0].id, name: rows[0].name });
    })
  );

  return NextResponse.json({ tag, grouped });
}
