"use client";

import { useActionState } from "react";
import { logout, setNewPassword } from "@/app/login/actions";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";
const labelClass = "block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1.5";

export default function SetPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, null);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="password" className={labelClass}>New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm" className={labelClass}>Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
        </div>
        {state?.error && <p className="text-sm text-[var(--color-accent-warm)]">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-lg bg-[var(--color-sidebar)] text-white font-medium hover:bg-[var(--color-sidebar-hover)] transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
      <form action={logout}>
        <button type="submit" className="w-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
          Sign out
        </button>
      </form>
    </div>
  );
}
