export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import stripe, { MONTHLY_PRICE_ID } from "@/lib/stripe";

// Excluded from the auth gate in proxy.ts: Stripe isn't a logged-in user.
// Signature verification against the raw body is the only gate.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Claimed inside the same transaction as the write it guards, so a crash
    // rolls back both and Stripe's retry can reprocess safely.
    const claim = await client.query(
      "INSERT INTO stripe_webhook_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id",
      [event.id, event.type]
    );
    if (claim.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.source !== "one_off_month") break;
        const userId = pi.metadata.userId;
        if (!userId) break;

        // A one-off month starts when the current paid period ends (or now,
        // if lapsed), so paying early never loses days.
        await client.query(
          `INSERT INTO payments (user_id, kind, amount_cents, currency, period_start, period_end, stripe_reference)
           SELECT $1, 'one_off', $2, $3, s.start, s.start + INTERVAL '1 month', $4
           FROM (SELECT GREATEST(NOW(), COALESCE(MAX(period_end), NOW())) AS start
                 FROM payments WHERE user_id = $1) s
           ON CONFLICT (stripe_reference) DO NOTHING`,
          [userId, pi.amount_received, pi.currency, pi.id]
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.parent?.subscription_details?.subscription) break;

        const line = invoice.lines.data[0];
        const priceRef = line?.pricing?.price_details?.price;
        const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id;
        // $0 invoices (the trial that covers an already-paid-ahead period) aren't payments.
        if (priceId !== MONTHLY_PRICE_ID || !line || invoice.amount_paid === 0) break;

        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const { rows } = await client.query<{ id: string }>("SELECT id FROM users WHERE stripe_customer_id = $1", [
          customerId,
        ]);
        if (!rows[0]) break;

        await client.query(
          `INSERT INTO payments (user_id, kind, amount_cents, currency, period_start, period_end, stripe_reference)
           VALUES ($1, 'subscription', $2, $3, to_timestamp($4), to_timestamp($5), $6)
           ON CONFLICT (stripe_reference) DO NOTHING`,
          [rows[0].id, invoice.amount_paid, invoice.currency, line.period.start, line.period.end, invoice.id]
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        // Paid-ahead auto-pay counts as on only once a card is attached.
        const status = sub.status === "trialing" && !sub.default_payment_method ? "incomplete" : sub.status;
        await client.query(
          `UPDATE users SET stripe_subscription_status = $2, stripe_cancel_at_period_end = $3
           WHERE stripe_customer_id = $1 AND stripe_subscription_id = $4`,
          [customerId, status, sub.cancel_at_period_end, sub.id]
        );
        break;
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ received: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stripe webhook processing failed", event.type, event.id, err);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  } finally {
    client.release();
  }
}
