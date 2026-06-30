import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import { NetworkPill } from '@/components/network-pill';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Root layout depends on per-request data (cookies, session) for any
// descendant that reads them, so it must be rendered per request rather
// than prerendered at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Driftwatch',
  description: 'Watches your RAG and emails you when it starts lying.',
  icons: {
    icon: [
      {
        url:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#10B981"/><circle cx="16" cy="16" r="6" fill="#0E0F11"/></svg>'
          ),
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <NetworkPill />
        </ToastProvider>
      </body>
    </html>
  );
}