export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUserId } from "@/lib/billing";
import stripe from "@/lib/stripe";

// Body { resume: true } undoes a pending cancellation. Either way the change
// takes effect at period end; the webhook updates the DB, not this route.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const resume = body?.resume === true;

  const { rows } = await pool.query<{ stripe_subscription_id: string | null }>(
    "SELECT stripe_subscription_id FROM users WHERE id = $1",
    [userId]
  );
  if (!rows[0]?.stripe_subscription_id) {
    return NextResponse.json({ error: "Auto-pay isn't on." }, { status: 400 });
  }

  await stripe.subscriptions.update(rows[0].stripe_subscription_id, { cancel_at_period_end: !resume });
  return NextResponse.json({ ok: true });
}
