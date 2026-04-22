import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ENTITY_TYPES } from "@/lib/entities";

// GET /api/relationships?entity_type=supplements&entity_id=<uuid>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");

  if (!entityType || !entityId || !ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Fetch all relationships where this entity appears on either side
  const { rows } = await pool.query(
    `SELECT * FROM entity_relationships
     WHERE (entity_type_a = $1 AND entity_id_a = $2)
        OR (entity_type_b = $1 AND entity_id_b = $2)`,
    [entityType, entityId]
  );

  // For each relationship, fetch the name of the related entity
  const enriched = await Promise.all(
    rows.map(async (rel) => {
      const isA = rel.entity_type_a === entityType && rel.entity_id_a === entityId;
      const relatedType = isA ? rel.entity_type_b : rel.entity_type_a;
      const relatedId = isA ? rel.entity_id_b : rel.entity_id_a;
      const { rows: nameRows } = await pool.query(
        `SELECT id, name FROM ${relatedType} WHERE id = $1`,
        [relatedId]
      );
      return {
        relationship_id: rel.id,
        entity_type: relatedType,
        entity_id: relatedId,
        name: nameRows[0]?.name ?? "Unknown",
        relationship_type: rel.relationship_type,
        notes: rel.notes,
      };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/relationships
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { entity_type_a, entity_id_a, entity_type_b, entity_id_b, relationship_type, notes } = body;

  if (
    !ENTITY_TYPES.includes(entity_type_a) ||
    !ENTITY_TYPES.includes(entity_type_b)
  ) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO entity_relationships
       (entity_type_a, entity_id_a, entity_type_b, entity_id_b, relationship_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (entity_type_a, entity_id_a, entity_type_b, entity_id_b) DO NOTHING
     RETURNING *`,
    [entity_type_a, entity_id_a, entity_type_b, entity_id_b, relationship_type ?? null, notes ?? null]
  );
  return NextResponse.json(rows[0] ?? { message: "Already exists" }, { status: 201 });
}

// DELETE /api/relationships?id=<uuid>
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await pool.query(`DELETE FROM entity_relationships WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
