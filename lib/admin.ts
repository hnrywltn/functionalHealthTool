import { notFound } from "next/navigation";
import pool from "./db";
import { getCurrentUserId } from "./billing";

export async function isSuperAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { rows } = await pool.query<{ is_super_admin: boolean }>("SELECT is_super_admin FROM users WHERE id = $1", [userId]);
  return rows[0]?.is_super_admin ?? false;
}

// For admin pages and actions: anyone else gets a 404, so the page's existence isn't revealed.
export async function requireSuperAdmin(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId || !(await isSuperAdmin(userId))) notFound();
  return userId;
}
