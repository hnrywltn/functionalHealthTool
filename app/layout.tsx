import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Health Reference",
  description: "Functional health practitioner reference library",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full flex antialiased" suppressHydrationWarning>
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="bg-[var(--color-sidebar)] mt-16">
            <div className="border-t border-white/10 px-8 py-5 flex items-center justify-between">
              <p className="text-white/30 text-xs">© 2026 Light Patterns, LLC. All rights reserved.</p>
              <p className="text-white/30 text-xs">Designed by Light Patterns</p>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
