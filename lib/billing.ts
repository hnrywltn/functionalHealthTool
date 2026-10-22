import { cookies } from "next/headers";
import pool from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export const AUTO_PAY_STATUSES = ["active", "trialing", "past_due"];
const DUE_SOON_DAYS = 5;

export async function getCurrentUserId(): Promise<string | null> {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return session?.sub ?? null;
}

export type BillingStatus = {
  paidThrough: Date | null;
  isPaid: boolean; // paidThrough is in the future
  subscriptionStatus: string | null;
  autoPay: boolean;
  cancelAtPeriodEnd: boolean;
  // What the reminder banner should say, if anything.
  reminder: "overdue" | "due_soon" | "auto_pay_failed" | null;
};

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const { rows } = await pool.query<{
    stripe_subscription_status: string | null;
    stripe_cancel_at_period_end: boolean;
    paid_through: Date | null;
  }>(
    `SELECT u.stripe_subscription_status, u.stripe_cancel_at_period_end,
            (SELECT MAX(period_end) FROM payments p WHERE p.user_id = u.id) AS paid_through
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  const status = row?.stripe_subscription_status ?? null;
  const autoPay = !!status && AUTO_PAY_STATUSES.includes(status);
  const cancelAtPeriodEnd = row?.stripe_cancel_at_period_end ?? false;
  const paidThrough = row?.paid_through ?? null;

  let reminder: BillingStatus["reminder"] = null;
  const now = Date.now();
  if (status === "past_due") {
    reminder = "auto_pay_failed";
  } else if (!paidThrough || paidThrough.getTime() < now) {
    reminder = "overdue";
  } else if (
    (!autoPay || cancelAtPeriodEnd) &&
    paidThrough.getTime() - now < DUE_SOON_DAYS * 24 * 60 * 60 * 1000
  ) {
    reminder = "due_soon";
  }

  const isPaid = !!paidThrough && paidThrough.getTime() > now;
  return { paidThrough, isPaid, subscriptionStatus: status, autoPay, cancelAtPeriodEnd, reminder };
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatMoney(cents: number, currency = "usd") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
}
