"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { getCurrentUserId } from "@/lib/billing";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";

// Compared against when the email doesn't exist, so timing doesn't reveal valid emails.
const DUMMY_HASH = "$2b$12$ZyTvJuBldsSJzHBEUfUeae3PbZOvzxCsz95ZZFSk13iJwRlR2THaO";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function setSessionCookie(userId: string, email: string, mustChangePassword: boolean) {
  const token = await createSessionToken(userId, email, mustChangePassword);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function login(_prev: { error: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const { rows } = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    must_change_password: boolean;
  }>("SELECT id, email, password_hash, must_change_password FROM users WHERE email = $1", [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Incorrect email or password." };

  await setSessionCookie(user.id, user.email, user.must_change_password);
  redirect(user.must_change_password ? "/set-password" : safeNext(formData.get("next")));
}

export async function setNewPassword(_prev: { error: string } | null, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query<{ email: string }>(
    `UPDATE users SET password_hash = $2, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $1 RETURNING email`,
    [userId, hash]
  );
  if (!rows[0]) redirect("/login");

  await setSessionCookie(userId, rows[0].email, false);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
