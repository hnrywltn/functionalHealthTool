export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`SELECT id, name FROM tags ORDER BY name ASC`);
  return NextResponse.json(rows);
}
