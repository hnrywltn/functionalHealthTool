export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ENTITY_TYPES } from "@/lib/entities";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const entity = searchParams.get("entity");

  if (!q || q.length < 2) return NextResponse.json([]);

  const types =
    entity && ENTITY_TYPES.includes(entity) ? [entity] : ENTITY_TYPES;
  const pattern = `%${q}%`;

  const rows = await Promise.all(
    types.map(async (type) => {
      const { rows } = await pool.query(
        `SELECT id, name, description FROM ${type}
         WHERE name ILIKE $1 OR description ILIKE $1
         ORDER BY name ASC LIMIT 8`,
        [pattern]
      );
      return rows.map((r) => ({ ...r, entity_type: type }));
    })
  );

  return NextResponse.json(rows.flat());
}
