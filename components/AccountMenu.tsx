"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { logout } from "@/app/login/actions";

const itemClass =
  "block w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors";

export default function AccountMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (pathname === "/login" || pathname === "/set-password") return null;

  return (
    <div className="flex justify-end px-6 pt-4">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Account menu"
          aria-expanded={open}
          className="w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent-hover)] transition-colors"
        >
          <User className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 z-30 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg py-1">
            <span className={`${itemClass} text-[var(--color-muted)] hover:bg-transparent cursor-default flex justify-between`}>
              Settings <span className="text-xs">Soon</span>
            </span>
            {isAdmin ? (
              <Link href="/admin" onClick={() => setOpen(false)} className={itemClass}>
                Admin
              </Link>
            ) : (
              <Link href="/payments" onClick={() => setOpen(false)} className={itemClass}>
                Payments
              </Link>
            )}
            <div className="my-1 border-t border-[var(--color-border)]" />
            <form action={logout}>
              <button type="submit" className={itemClass}>
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
