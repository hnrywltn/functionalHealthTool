"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Props = {
  clientSecret: string;
  // "payment" charges now; "setup" only saves the card (auto-pay starting later).
  mode: "payment" | "setup";
  submitLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function CheckoutForm(props: Props) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <Form {...props} />
    </Elements>
  );
}

function Form({ mode, submitLabel, onSuccess, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const result =
      mode === "setup"
        ? await stripe.confirmSetup({ elements, redirect: "if_required" })
        : await stripe.confirmPayment({ elements, redirect: "if_required" });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }
    const status = "setupIntent" in result ? result.setupIntent?.status : result.paymentIntent?.status;
    if (status === "succeeded" || status === "processing") {
      onSuccess();
      return;
    }
    setError("Payment did not complete.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-[var(--color-accent-warm)]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar)] text-white hover:bg-[var(--color-sidebar-hover)] transition-colors disabled:opacity-60"
        >
          {submitting ? "Processing…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
