import Link from 'next/link';
import type { ReactNode } from 'react';
import { COPY } from '@/lib/copy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
            <span
              aria-hidden
              className="inline-block h-6 w-6 rounded-md bg-brand"
            />
            <span>{COPY.brandShort ?? 'Driftwatch'}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/login" className="btn-secondary">
              {COPY.marketing.nav.signIn}
            </Link>
            <Link href="/signup" className="btn-primary">
              {COPY.marketing.nav.getStarted}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-text-muted">
          <span>{COPY.marketing.footer.copyright(year)}</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-text">
              {COPY.marketing.nav.signIn}
            </Link>
            <Link href="/signup" className="hover:text-text">
              {COPY.marketing.nav.getStarted}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}