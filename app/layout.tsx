import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { SupabaseProvider } from '@/lib/supabase-provider';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'University Event Management',
  description: 'High-traffic, payment-safe university event management system'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <SupabaseProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <Link href="/" className="font-semibold tracking-tight">
                  UnivEvents
                </Link>
                <nav className="flex items-center gap-4 text-sm text-slate-300">
                  <Link href="/events" className="hover:text-white">
                    Events
                  </Link>
                  <Link href="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                  <Link href="/auth/login" className="rounded border border-slate-700 px-3 py-1 text-xs hover:border-slate-500">
                    Login
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1 bg-gradient-to-b from-slate-950 to-slate-900">
              {children}
            </main>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}
