"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutForm from "./CheckoutForm";

type Checkout = { clientSecret: string; mode: "payment" | "setup"; kind: "auto" | "once" };

const primaryButton =
  "px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar)] text-white hover:bg-[var(--color-sidebar-hover)] transition-colors disabled:opacity-60";

export default function PaymentOptions({
  monthlyLabel,
  oneOffLabel,
  showAutoPay,
  showPayOnce,
  paidAheadUntil,
}: {
  monthlyLabel: string;
  oneOffLabel: string;
  showAutoPay: boolean;
  showPayOnce: boolean;
  paidAheadUntil: string | null;
}) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState<"auto" | "once" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function start(kind: "auto" | "once") {
    setLoading(kind);
    setError(null);
    const url = kind === "auto" ? "/api/stripe/create-subscription" : "/api/stripe/create-payment-intent";
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok || !data.clientSecret) {
      setError(data.error ?? "Could not start checkout.");
      return;
    }
    setCheckout({ clientSecret: data.clientSecret, mode: data.mode ?? "payment", kind });
  }

  function handleSuccess() {
    setCheckout(null);
    setDone(true);
    // The webhook records the payment a moment later; refresh to pick it up.
    setTimeout(() => router.refresh(), 1500);
    setTimeout(() => router.refresh(), 5000);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text)]">
        Thank you! Your payment went through. This page will update in a moment.
      </div>
    );
  }

  if (checkout) {
    const label =
      checkout.kind === "once" ? `Pay ${oneOffLabel}` : checkout.mode === "setup" ? "Save card" : `Pay ${monthlyLabel}`;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="font-medium text-[var(--color-text)]">
          {checkout.kind === "auto" ? "Turn on auto-pay" : "Pay one month"}
        </h2>
        {checkout.kind === "auto" && checkout.mode === "setup" && paidAheadUntil && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            You&apos;re paid through {paidAheadUntil}. Your card will first be charged then.
          </p>
        )}
        <CheckoutForm
          clientSecret={checkout.clientSecret}
          mode={checkout.mode}
          submitLabel={label}
          onSuccess={handleSuccess}
          onCancel={() => setCheckout(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {showAutoPay && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col">
            <h2 className="font-medium text-[var(--color-text)]">Auto-pay</h2>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
              {monthlyLabel}
              <span className="text-sm font-normal text-[var(--color-muted)]"> / month</span>
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)] flex-1">
              Your card is charged automatically each month. Cancel anytime.
            </p>
            <button onClick={() => start("auto")} disabled={loading !== null} className={`${primaryButton} mt-4 self-start`}>
              {loading === "auto" ? "…" : "Turn on auto-pay"}
            </button>
          </div>
        )}
        {showPayOnce && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col">
            <h2 className="font-medium text-[var(--color-text)]">Pay one month</h2>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{oneOffLabel}</p>
            <p className="mt-2 text-sm text-[var(--color-muted)] flex-1">
              Pay for a single month now. Your card isn&apos;t saved. Paying early adds a month on top of what&apos;s already paid.
            </p>
            <button onClick={() => start("once")} disabled={loading !== null} className={`${primaryButton} mt-4 self-start`}>
              {loading === "once" ? "…" : `Pay ${oneOffLabel}`}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-[var(--color-accent-warm)]">{error}</p>}
    </div>
  );
}
