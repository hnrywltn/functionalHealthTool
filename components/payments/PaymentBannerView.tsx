"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PaymentBannerView({ message }: { message: string }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/payments") return null;

  return (
    <div className="mx-6 mt-4 flex items-center justify-between gap-4 rounded-lg border border-[#FE6959]/30 bg-[#FE6959]/8 px-4 py-2.5 text-sm text-[var(--color-text)]">
      <span>{message}</span>
      <Link href="/payments" className="shrink-0 font-medium text-[#FE6959] hover:underline">
        Go to payments →
      </Link>
    </div>
  );
}
