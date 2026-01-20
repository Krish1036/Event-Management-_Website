import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { SupabaseProvider } from '@/lib/supabase-provider';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'University Event Management',
  description: 'High-traffic, payment-safe university event management system'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <SupabaseProvider>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">
              {children}
            </main>
            <PublicFooter />
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}
