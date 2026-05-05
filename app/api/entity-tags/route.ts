export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");
  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  const { rows } = await pool.query(
    `SELECT t.id, t.name FROM tags t
     JOIN entity_tags et ON et.tag_id = t.id
     WHERE et.entity_type = $1 AND et.entity_id = $2
     ORDER BY t.name ASC`,
    [entity_type, entity_id]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { entity_type, entity_id, tag_name } = await req.json();
  const normalized = String(tag_name).toLowerCase().replace(/^#/, "").trim();
  if (!normalized) return NextResponse.json({ error: "Empty tag" }, { status: 400 });

  // Upsert tag
  const { rows: tagRows } = await pool.query(
    `INSERT INTO tags (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [normalized]
  );
  const tag = tagRows[0];

  // Upsert entity_tag
  await pool.query(
    `INSERT INTO entity_tags (entity_type, entity_id, tag_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [entity_type, entity_id, tag.id]
  );

  return NextResponse.json(tag, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");
  const tag_id = searchParams.get("tag_id");
  if (!entity_type || !entity_id || !tag_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  await pool.query(
    `DELETE FROM entity_tags WHERE entity_type=$1 AND entity_id=$2 AND tag_id=$3`,
    [entity_type, entity_id, tag_id]
  );
  return NextResponse.json({ ok: true });
}
