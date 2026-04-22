import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ENTITY_TYPES } from "@/lib/entities";

type Params = { params: Promise<{ entity: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!ENTITY_TYPES.includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { rows } = await pool.query(
    `SELECT * FROM ${entity} WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!ENTITY_TYPES.includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const keys = Object.keys(body);
  const values = Object.values(body);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

  const { rows } = await pool.query(
    `UPDATE ${entity} SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { entity, id } = await params;
  if (!ENTITY_TYPES.includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await pool.query(`DELETE FROM ${entity} WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
