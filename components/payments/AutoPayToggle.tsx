"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Cancels auto-pay at the end of the paid period, or resumes a pending cancellation.
export default function AutoPayToggle({ resume }: { resume: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!resume && !confirm("Turn off auto-pay? You'll keep access through the period you've already paid for.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/stripe/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    // The webhook updates the status; give it a moment.
    setTimeout(() => router.refresh(), 1500);
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <div className="text-right">
      <button
        onClick={submit}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors disabled:opacity-60"
      >
        {loading ? "…" : resume ? "Keep auto-pay on" : "Turn off auto-pay"}
      </button>
      {error && <p className="mt-2 text-xs text-[var(--color-accent-warm)]">{error}</p>}
    </div>
  );
}
