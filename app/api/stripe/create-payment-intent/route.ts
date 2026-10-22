export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/billing";
import stripe, { ONE_OFF_PRICE_ID, getOrCreateStripeCustomer, getPriceAmount } from "@/lib/stripe";

// Pays for one month without saving a card. The amount comes from the one-off
// Price in Stripe, never from the client.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(userId);
  const { amountCents, currency } = await getPriceAmount(ONE_OFF_PRICE_ID);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    description: "Health Reference: one month",
    // The webhook only records PaymentIntents tagged with this source; a
    // subscription invoice's own PaymentIntent fires the same event type.
    metadata: { userId, source: "one_off_month" },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
