"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin";

const KINDS = ["one_off", "subscription", "manual"];

export async function recordPayment(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const dollars = Number(formData.get("amount"));
  const months = Number(formData.get("months") || 1);
  const start = String(formData.get("start") ?? "").trim(); // YYYY-MM-DD or empty
  const reference = String(formData.get("reference") ?? "").trim();

  if (!KINDS.includes(kind)) return { error: "Pick a type." };
  if (!Number.isFinite(dollars) || dollars < 0) return { error: "Amount must be a number, 0 or more." };
  if (!Number.isInteger(months) || months < 1 || months > 24) return { error: "Months must be 1–24." };
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return { error: "Start date is invalid." };

  // Same rule as the webhook: with no start date, the new period begins when the
  // current one ends (or now, if lapsed). Pasting the Stripe ID (pi_… / in_…) means
  // a late webhook for the same payment is ignored instead of double-counted.
  const { rowCount } = await pool.query(
    `INSERT INTO payments (user_id, kind, amount_cents, currency, period_start, period_end, stripe_reference)
     SELECT $1, $2, $3, 'usd', s.start, s.start + make_interval(months => $4), $5
     FROM (SELECT COALESCE($6::timestamptz, GREATEST(NOW(), COALESCE(MAX(period_end), NOW()))) AS start
           FROM payments WHERE user_id = $1) s
     ON CONFLICT (stripe_reference) DO NOTHING`,
    [userId, kind, Math.round(dollars * 100), months, reference || `manual_${randomUUID()}`, start || null]
  );
  if (rowCount === 0) return { error: "A payment with that Stripe ID is already recorded." };

  revalidatePath("/admin");
  return { ok: "Payment recorded." };
}

export async function deletePayment(formData: FormData) {
  await requireSuperAdmin();
  await pool.query("DELETE FROM payments WHERE id = $1", [String(formData.get("paymentId") ?? "")]);
  revalidatePath("/admin");
}
