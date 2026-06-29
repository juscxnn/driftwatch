'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { COPY } from '@/lib/copy';
import { signOutAction } from '@/app/(auth)/actions';

type NavProps = {
  /**
   * Server-pre-rendered session info so the nav renders correctly on
   * first paint without waiting for the browser client.
   */
  initialEmail?: string | null;
  initialOrgName?: string | null;
  pendingTriageCount?: number;
};

export function Nav({
  initialEmail = null,
  initialOrgName = null,
  pendingTriageCount = 0,
}: NavProps) {
  const router = useRouter();
  const [email] = useState<string | null>(initialEmail);
  const [orgName] = useState<string | null>(initialOrgName);
  const [pending] = useState<number>(pendingTriageCount);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      try {
        const sb = getSupabaseBrowser();
        await sb.auth.signOut();
      } catch {
        // ignore — server action will still clear cookies
      }
      await signOutAction();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-md bg-brand"
          />
          <span>{COPY.brand}</span>
        </Link>

        {email ? (
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink href="/" label={COPY.nav.home} />
            <NavLink href="/projects" label={COPY.nav.projects} />
            <NavLinkWithBadge
              href="/triage"
              label={COPY.nav.triage}
              count={pending}
            />
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {orgName ? (
            <span className="hidden text-text-muted sm:inline">
              {orgName}
            </span>
          ) : null}
          {email ? (
            <>
              <span className="hidden text-text-muted sm:inline">{email}</span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="btn-ghost"
              >
                {COPY.nav.signOut}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                {COPY.nav.signIn}
              </Link>
              <Link href="/signup" className="btn-primary">
                {COPY.nav.getStarted}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        isActive
          ? 'text-text bg-surface-muted'
          : 'text-text-muted hover:text-text hover:bg-surface-muted'
      }`}
    >
      {label}
    </Link>
  );
}

function NavLinkWithBadge({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: number;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
        isActive
          ? 'text-text bg-surface-muted'
          : 'text-text-muted hover:text-text hover:bg-surface-muted'
      }`}
    >
      {label}
      {count > 0 ? (
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-danger-muted px-1.5 text-[10px] font-medium leading-5 text-danger">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
