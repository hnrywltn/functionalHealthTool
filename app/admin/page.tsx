export const dynamic = "force-dynamic";

import pool from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin";
import { formatDate, formatMoney } from "@/lib/billing";
import RecordPaymentForm from "./RecordPaymentForm";
import { deletePayment } from "./actions";

export const metadata = { title: "Admin · Health Reference" };

const card = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6";
const KIND_LABELS: Record<string, string> = { one_off: "One month", subscription: "Auto-pay", manual: "Manual" };

type UserRow = {
  id: string;
  email: string;
  is_super_admin: boolean;
  must_change_password: boolean;
  stripe_subscription_status: string | null;
  paid_through: Date | null;
  is_current: boolean;
};

type PaymentRow = {
  id: string;
  user_id: string;
  kind: string;
  amount_cents: number;
  currency: string;
  period_start: Date;
  period_end: Date;
  stripe_reference: string;
  created_at: Date;
};

export default async function AdminPage() {
  await requireSuperAdmin();

  const [{ rows: users }, { rows: payments }] = await Promise.all([
    pool.query<UserRow>(
      `SELECT u.id, u.email, u.is_super_admin, u.must_change_password, u.stripe_subscription_status,
              (SELECT MAX(period_end) FROM payments p WHERE p.user_id = u.id) AS paid_through,
              COALESCE((SELECT MAX(period_end) FROM payments p WHERE p.user_id = u.id) > NOW(), FALSE) AS is_current
       FROM users u ORDER BY u.is_super_admin, u.email`
    ),
    pool.query<PaymentRow>(
      `SELECT id, user_id, kind, amount_cents, currency, period_start, period_end, stripe_reference, created_at
       FROM payments ORDER BY created_at DESC`
    ),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Admin</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Accounts and payments. Only super admins can see this page.</p>
      </div>

      {users.map((u) => {
        const current = u.is_current;
        const userPayments = payments.filter((p) => p.user_id === u.id);
        return (
          <div key={u.id} className={`${card} space-y-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-medium text-[var(--color-text)]">{u.email}</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  {u.is_super_admin ? "Super admin · billing exempt" : (
                    <>
                      {u.paid_through ? `Paid through ${formatDate(u.paid_through)}` : "No payments"}
                      {" · "}Auto-pay: {u.stripe_subscription_status ?? "none"}
                    </>
                  )}
                  {u.must_change_password && " · Temp password not yet changed"}
                </p>
              </div>
              {!u.is_super_admin && (
                <span
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    current ? "bg-[var(--color-accent)] text-[var(--color-text)]" : "bg-[#FE6959]/15 text-[#FE6959]"
                  }`}
                >
                  {current ? "Current" : "Overdue"}
                </span>
              )}
            </div>

            {!u.is_super_admin && (
              <>
                {userPayments.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                        <th className="font-normal pb-2">Recorded</th>
                        <th className="font-normal pb-2">Type</th>
                        <th className="font-normal pb-2">Covers</th>
                        <th className="font-normal pb-2">Reference</th>
                        <th className="font-normal pb-2 text-right">Amount</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {userPayments.map((p) => (
                        <tr key={p.id} className="border-t border-[var(--color-border)]">
                          <td className="py-2">{formatDate(p.created_at)}</td>
                          <td className="py-2">{KIND_LABELS[p.kind] ?? p.kind}</td>
                          <td className="py-2 text-[var(--color-muted)]">
                            {formatDate(p.period_start)} – {formatDate(p.period_end)}
                          </td>
                          <td className="py-2 text-xs text-[var(--color-muted)] font-mono truncate max-w-[10rem]" title={p.stripe_reference}>
                            {p.stripe_reference.startsWith("manual_") ? "—" : p.stripe_reference}
                          </td>
                          <td className="py-2 text-right">{formatMoney(p.amount_cents, p.currency)}</td>
                          <td className="py-2 text-right">
                            <form action={deletePayment}>
                              <input type="hidden" name="paymentId" value={p.id} />
                              <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[#FE6959]">
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="border-t border-[var(--color-border)] pt-5">
                  <RecordPaymentForm userId={u.id} />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
