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
    `SELECT a.id, a.label, a.file_key, a.file_type
     FROM attachments a
     JOIN entity_attachments ea ON ea.attachment_id = a.id
     WHERE ea.entity_type = $1 AND ea.entity_id = $2
     ORDER BY a.created_at DESC`,
    [entity_type, entity_id]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { entity_type, entity_id, attachment_id } = await req.json();
  await pool.query(
    `INSERT INTO entity_attachments (entity_type, entity_id, attachment_id)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [entity_type, entity_id, attachment_id]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");
  const attachment_id = searchParams.get("attachment_id");
  if (!entity_type || !entity_id || !attachment_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  await pool.query(
    `DELETE FROM entity_attachments WHERE entity_type=$1 AND entity_id=$2 AND attachment_id=$3`,
    [entity_type, entity_id, attachment_id]
  );
  return NextResponse.json({ ok: true });
}
