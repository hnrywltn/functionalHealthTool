export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { AUTO_PAY_STATUSES, getBillingStatus, getCurrentUserId } from "@/lib/billing";
import stripe, { MONTHLY_PRICE_ID, getOrCreateStripeCustomer } from "@/lib/stripe";

// Starts monthly auto-pay; the card is saved on the subscription for future months.
// If she's already paid ahead (one-off months), billing starts when that runs
// out: the subscription trials until then and we only collect the card now
// (mode "setup"). Otherwise the first month is charged now (mode "payment").
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { rows } = await pool.query<{ stripe_subscription_id: string | null; stripe_subscription_status: string | null }>(
    "SELECT stripe_subscription_id, stripe_subscription_status FROM users WHERE id = $1",
    [userId]
  );
  const status = rows[0]?.stripe_subscription_status;
  if (status && AUTO_PAY_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Auto-pay is already on." }, { status: 400 });
  }

  // Clean up a previous attempt she didn't finish, so it can't bill later.
  const previous = rows[0]?.stripe_subscription_id;
  if (previous) {
    await stripe.subscriptions.cancel(previous).catch(() => {}); // already canceled/expired is fine
  }

  const { paidThrough } = await getBillingStatus(userId);
  const paidAhead = paidThrough && paidThrough.getTime() > Date.now() + 60_000;

  const customerId = await getOrCreateStripeCustomer(userId);
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: MONTHLY_PRICE_ID }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    ...(paidAhead
      ? {
          trial_end: Math.floor(paidThrough.getTime() / 1000),
          // If she never finishes entering a card, don't try to bill at trial end.
          trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
        }
      : {}),
    // The nested expand is required; a bare "latest_invoice" doesn't populate confirmation_secret.
    expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
    metadata: { userId },
  });

  // A paid-ahead subscription is "trialing" before any card is saved; record it
  // as incomplete until the webhook sees the card attached.
  await pool.query(
    "UPDATE users SET stripe_subscription_id = $2, stripe_subscription_status = $3, stripe_cancel_at_period_end = FALSE WHERE id = $1",
    [userId, subscription.id, paidAhead ? "incomplete" : subscription.status]
  );

  if (paidAhead) {
    const setup = subscription.pending_setup_intent;
    const clientSecret = setup && typeof setup !== "string" ? setup.client_secret : null;
    if (!clientSecret) return NextResponse.json({ error: "Could not start auto-pay checkout." }, { status: 500 });
    return NextResponse.json({ clientSecret, mode: "setup" });
  }

  const invoice = subscription.latest_invoice;
  const clientSecret = invoice && typeof invoice !== "string" ? invoice.confirmation_secret?.client_secret : null;
  if (!clientSecret) return NextResponse.json({ error: "Could not start auto-pay checkout." }, { status: 500 });
  return NextResponse.json({ clientSecret, mode: "payment" });
}
