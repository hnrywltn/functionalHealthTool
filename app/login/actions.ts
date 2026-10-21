"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";

// Compared against when the email doesn't exist, so timing doesn't reveal valid emails.
const DUMMY_HASH = "$2b$12$ZyTvJuBldsSJzHBEUfUeae3PbZOvzxCsz95ZZFSk13iJwRlR2THaO";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: { error: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const { rows } = await pool.query<{ id: string; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Incorrect email or password." };

  const token = await createSessionToken(user.id, user.email);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
