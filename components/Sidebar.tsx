"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENTITY_CONFIGS } from "@/lib/entities";

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <aside className="w-56 shrink-0 bg-[var(--color-sidebar)] min-h-screen flex flex-col">
      <Link href="/" className="px-5 py-6 border-b border-white/10 block hover:bg-white/5 transition-colors">
        <p className="text-white/40 text-xs uppercase tracking-widest font-medium">
          Health Reference
        </p>
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ENTITY_CONFIGS.map((entity) => {
          const active = pathname.startsWith(`/${entity.type}`);
          return (
            <Link
              key={entity.type}
              href={`/${entity.type}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${entity.color}`}
              />
              {entity.labelPlural}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
