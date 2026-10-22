import Stripe from "stripe";
import pool from "./db";

// The SDK throws in its constructor on a falsy key, and `next build` evaluates
// route modules, so a missing key at build time would crash the build. The
// placeholder is never used for a real request.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_build_placeholder");

export default stripe;

export const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID!;
export const ONE_OFF_PRICE_ID = process.env.STRIPE_ONE_OFF_PRICE_ID!;

const priceCache = new Map<string, { amountCents: number; currency: string }>();

export async function getPriceAmount(priceId: string) {
  const cached = priceCache.get(priceId);
  if (cached) return cached;
  const price = await stripe.prices.retrieve(priceId);
  const value = { amountCents: price.unit_amount ?? 0, currency: price.currency };
  priceCache.set(priceId, value);
  return value;
}

// One Stripe Customer per user, created on first checkout.
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const { rows } = await pool.query<{ stripe_customer_id: string | null; email: string }>(
    "SELECT stripe_customer_id, email FROM users WHERE id = $1",
    [userId]
  );
  if (!rows[0]) throw new Error("User not found.");
  if (rows[0].stripe_customer_id) return rows[0].stripe_customer_id;

  const customer = await stripe.customers.create({ email: rows[0].email, metadata: { userId } });
  await pool.query("UPDATE users SET stripe_customer_id = $2 WHERE id = $1", [userId, customer.id]);
  return customer.id;
}
