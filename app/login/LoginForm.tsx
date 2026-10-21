"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>
      {state?.error && <p className="text-sm text-[var(--color-accent-warm)]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg bg-[var(--color-sidebar)] text-white font-medium hover:bg-[var(--color-sidebar-hover)] transition-colors disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
