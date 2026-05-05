export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { label } = await req.json();
  const { rows } = await pool.query(
    `UPDATE attachments SET label = $1 WHERE id = $2 RETURNING *`,
    [label, id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await pool.query(`DELETE FROM attachments WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
