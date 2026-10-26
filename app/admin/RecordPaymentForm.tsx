"use client";

import { useActionState } from "react";
import { recordPayment } from "./actions";

const input =
  "w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";
const label = "block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1";

export default function RecordPaymentForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(recordPayment, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={label}>Type</label>
          <select name="kind" defaultValue="one_off" className={input}>
            <option value="one_off">One month</option>
            <option value="subscription">Auto-pay</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <label className={label}>Amount ($)</label>
          <input name="amount" type="number" step="0.01" min="0" defaultValue="50" required className={input} />
        </div>
        <div>
          <label className={label}>Months</label>
          <input name="months" type="number" min="1" max="24" defaultValue="1" required className={input} />
        </div>
        <div>
          <label className={label}>Start (optional)</label>
          <input name="start" type="date" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Stripe ID (optional, e.g. pi_… or in_…)</label>
        <input name="reference" type="text" placeholder="Prevents a duplicate if the webhook arrives later" className={input} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[var(--color-sidebar)] text-white text-sm font-medium hover:bg-[var(--color-sidebar-hover)] transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Record payment"}
        </button>
        {state?.error && <span className="text-sm text-[var(--color-accent-warm)]">{state.error}</span>}
        {state?.ok && <span className="text-sm text-[var(--color-muted)]">{state.ok}</span>}
      </div>
      <p className="text-xs text-[var(--color-muted)]">With no start date, it begins when the current paid period ends (or today, if lapsed).</p>
    </form>
  );
}
