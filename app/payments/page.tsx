export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { formatDate, formatMoney, getBillingStatus, getCurrentUserId } from "@/lib/billing";
import { isSuperAdmin } from "@/lib/admin";
import { MONTHLY_PRICE_ID, ONE_OFF_PRICE_ID, getPriceAmount } from "@/lib/stripe";
import PaymentOptions from "@/components/payments/PaymentOptions";
import AutoPayToggle from "@/components/payments/AutoPayToggle";

export const metadata = { title: "Payments · Health Reference" };

const card = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6";

export default async function PaymentsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  // Admins don't pay; send them to the admin dashboard instead.
  if (await isSuperAdmin(userId)) redirect("/admin");

  const billing = await getBillingStatus(userId);
  // null if Stripe keys/price IDs are missing or wrong; the page still shows status and history.
  const prices = await Promise.all([getPriceAmount(MONTHLY_PRICE_ID), getPriceAmount(ONE_OFF_PRICE_ID)]).catch((err) => {
    console.error("Could not load Stripe prices:", err);
    return null;
  });
  const { rows: history } = await pool.query<{
    id: string;
    kind: string;
    amount_cents: number;
    currency: string;
    period_start: Date;
    period_end: Date;
    created_at: Date;
  }>(
    "SELECT id, kind, amount_cents, currency, period_start, period_end, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  const { paidThrough, isPaid, autoPay, cancelAtPeriodEnd, subscriptionStatus } = billing;
  const paidThroughLabel = paidThrough ? formatDate(paidThrough) : null;

  let headline: string;
  let detail: string | null = null;
  if (subscriptionStatus === "past_due") {
    headline = "Auto-pay didn't go through";
    detail = "Stripe will try your card again. You can also pay one month below.";
  } else if (autoPay && cancelAtPeriodEnd) {
    headline = "Auto-pay is ending";
    detail = paidThroughLabel ? `You're paid through ${paidThroughLabel}. No further charges after that.` : null;
  } else if (autoPay) {
    headline = "Auto-pay is on";
    detail = paidThroughLabel ? `Next charge on ${paidThroughLabel}.` : null;
  } else if (isPaid) {
    headline = `Paid through ${paidThroughLabel}`;
    detail = "Turn on auto-pay, or pay another month whenever you like.";
  } else {
    headline = "Payment due";
    detail = paidThroughLabel ? `Your last paid month ended ${paidThroughLabel}.` : "Choose how you'd like to pay below.";
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Payments</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Your Health Reference subscription</p>
      </div>

      <div className={`${card} flex items-center justify-between gap-4`}>
        <div>
          <p className="text-lg font-medium text-[var(--color-text)]">{headline}</p>
          {detail && <p className="text-sm text-[var(--color-muted)] mt-1">{detail}</p>}
        </div>
        {autoPay && subscriptionStatus !== "past_due" && <AutoPayToggle resume={cancelAtPeriodEnd} />}
      </div>

      {(!autoPay || cancelAtPeriodEnd || subscriptionStatus === "past_due") && !prices && (
        <div className={`${card} text-sm text-[var(--color-muted)]`}>
          Online payment isn&apos;t available right now. Please try again later.
        </div>
      )}

      {(!autoPay || cancelAtPeriodEnd || subscriptionStatus === "past_due") && prices && (
        <PaymentOptions
          monthlyLabel={formatMoney(prices[0].amountCents, prices[0].currency)}
          oneOffLabel={formatMoney(prices[1].amountCents, prices[1].currency)}
          showAutoPay={!autoPay}
          showPayOnce
          paidAheadUntil={isPaid ? paidThroughLabel : null}
        />
      )}

      <div className={card}>
        <h2 className="font-medium text-[var(--color-text)] mb-3">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="font-normal pb-2">Date</th>
                <th className="font-normal pb-2">Type</th>
                <th className="font-normal pb-2">Covers</th>
                <th className="font-normal pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2">{formatDate(p.created_at)}</td>
                  <td className="py-2">{p.kind === "subscription" ? "Auto-pay" : p.kind === "manual" ? "Manual" : "One month"}</td>
                  <td className="py-2 text-[var(--color-muted)]">
                    {formatDate(p.period_start)} – {formatDate(p.period_end)}
                  </td>
                  <td className="py-2 text-right">{formatMoney(p.amount_cents, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
