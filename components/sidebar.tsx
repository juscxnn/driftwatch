'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { signOutAction } from '@/app/(auth)/actions';
import { COPY } from '@/lib/copy';
import {
  InboxIcon,
  ProjectsIcon,
  TriageIcon,
  SettingsIcon,
  SignOutIcon,
} from '@/components/icons';

type SidebarProps = {
  email: string | null;
  orgName: string | null;
  driftCount?: number;
  reviewCount?: number;
};

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export function Sidebar({
  email,
  orgName,
  driftCount = 0,
  reviewCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const items: NavItem[] = [
    { href: '/', label: COPY.nav.home, Icon: InboxIcon, badge: driftCount },
    { href: '/projects', label: COPY.nav.projects, Icon: ProjectsIcon },
    {
      href: '/triage',
      label: COPY.nav.triage,
      Icon: TriageIcon,
      badge: reviewCount,
    },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function handleSignOut() {
    startSignOut(async () => {
      try {
        const sb = getSupabaseBrowser();
        await sb.auth.signOut();
      } catch {
        // server action clears cookies regardless
      }
      await signOutAction();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span
          aria-hidden
          className="inline-block h-6 w-6 rounded-md bg-brand"
        />
        <Link
          href="/"
          className="text-sm font-medium tracking-tight text-text hover:text-text"
        >
          {COPY.brandShort ?? 'Driftwatch'}
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 p-2">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {orgName ? (
          <div className="truncate text-sm font-medium text-text" title={orgName}>
            {orgName}
          </div>
        ) : null}
        {email ? (
          <div
            className="truncate text-xs text-text-muted"
            title={email}
          >
            {email}
          </div>
        ) : null}
        <div className="mt-3 flex flex-col gap-0.5">
          <Link
            href="/settings"
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              pathname.startsWith('/settings')
                ? 'text-text bg-surface-muted'
                : 'text-text-muted hover:text-text hover:bg-surface-muted'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            {COPY.nav.settings}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-50"
          >
            <SignOutIcon className="h-4 w-4" />
            {signingOut ? COPY.nav.signingOut : COPY.nav.signOut}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const { Icon, label, href, badge } = item;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active
          ? 'text-text bg-surface-muted'
          : 'text-text-muted hover:text-text hover:bg-surface-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-danger-muted px-1.5 text-[10px] font-medium leading-5 text-danger">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}