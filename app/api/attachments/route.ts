export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`
    SELECT a.id, a.label, a.file_key, a.file_type, a.created_at,
           COALESCE(
             json_agg(
               json_build_object('entity_type', ea.entity_type, 'entity_id', ea.entity_id)
             ) FILTER (WHERE ea.id IS NOT NULL),
             '[]'
           ) AS entities
    FROM attachments a
    LEFT JOIN entity_attachments ea ON ea.attachment_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { label, file_key, file_type } = await req.json();
  const { rows } = await pool.query(
    `INSERT INTO attachments (label, file_key, file_type) VALUES ($1, $2, $3) RETURNING *`,
    [label, file_key, file_type ?? "other"]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
