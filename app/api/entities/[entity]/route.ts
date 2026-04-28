export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ENTITY_TYPES } from "@/lib/entities";

type Params = { params: Promise<{ entity: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { entity } = await params;
  if (!ENTITY_TYPES.includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { rows } = await pool.query(
    `SELECT * FROM ${entity} ORDER BY name ASC`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { entity } = await params;
  if (!ENTITY_TYPES.includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const { name, ...rest } = body;

  const keys = ["name", ...Object.keys(rest)];
  const values = [name, ...Object.values(rest)];
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const cols = keys.join(", ");

  const { rows } = await pool.query(
    `INSERT INTO ${entity} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return NextResponse.json(rows[0], { status: 201 });
}
