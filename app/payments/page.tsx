export const metadata = { title: "Payments · Health Reference" };

export default function PaymentsPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Payments</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Your subscription and billing history</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
        <p className="text-sm text-[var(--color-muted)]">No payments yet.</p>
      </div>
    </div>
  );
}
