import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AccountMenu from "@/components/AccountMenu";
import PaymentBanner from "@/components/payments/PaymentBanner";
import { getCurrentUserId } from "@/lib/billing";
import { isSuperAdmin } from "@/lib/admin";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Health Reference",
  description: "Functional health practitioner reference library.",
};

async function currentUserIsAdmin() {
  try {
    return await isSuperAdmin(await getCurrentUserId());
  } catch (err) {
    console.error("Admin check failed:", err);
    return false;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await currentUserIsAdmin();
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full flex antialiased" suppressHydrationWarning>
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          {!isAdmin && <PaymentBanner />}
          <AccountMenu isAdmin={isAdmin} />
          <div className="flex-1">{children}</div>
          <footer className="bg-[var(--color-sidebar)] mt-16">
            <div className="border-t border-white/10 px-8 py-5 flex items-center justify-between">
              <p className="text-white/30 text-xs">© 2026 Light Patterns, LLC. All rights reserved.</p>
              <a href="https://lightpatternsonline.com/#contact" target="_blank" rel="noopener noreferrer" className="text-white/30 text-xs hover:text-white/60 transition-colors">Designed by Light Patterns</a>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
