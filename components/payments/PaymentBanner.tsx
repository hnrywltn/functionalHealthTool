import { formatDate, getBillingStatus, getCurrentUserId } from "@/lib/billing";
import PaymentBannerView from "./PaymentBannerView";

async function getReminderMessage(): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { reminder, paidThrough } = await getBillingStatus(userId);
    if (!reminder) return null;

    const date = paidThrough ? formatDate(paidThrough) : null;
    if (reminder === "auto_pay_failed") return "Your automatic payment didn't go through.";
    if (reminder === "due_soon") return `Your next payment is due ${date}.`;
    return date ? `Your payment was due ${date}.` : "Your monthly payment is due.";
  } catch (err) {
    // A billing lookup problem should never take the site down.
    console.error("PaymentBanner failed:", err);
    return null;
  }
}

// A gentle reminder at the top of every page. It never blocks access.
export default async function PaymentBanner() {
  const message = await getReminderMessage();
  return message ? <PaymentBannerView message={message} /> : null;
}
