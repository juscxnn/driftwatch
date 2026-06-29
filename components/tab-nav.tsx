'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export type Tab = {
  key: string;
  label: string;
  href: string;
  badge?: number;
};

type TabNavProps = {
  tabs: Tab[];
  /**
   * How the active tab is determined. Default: exact href match against
   * the current pathname + the `tab` search param value. The Overview tab
   * (or whichever has the base href) is active when `tab` is absent.
   */
  basePath: string;
  paramName?: string;
};

export function TabNav({ tabs, basePath, paramName = 'tab' }: TabNavProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get(paramName);

  return (
    <nav
      role="tablist"
      aria-label="Project sections"
      className="flex flex-wrap items-center gap-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const isOverview = tab.href === basePath;
        const isActive = isOverview ? !active || active === tab.key : active === tab.key;
        const href = isOverview ? basePath : `${basePath}?${paramName}=${tab.key}`;
        const activeOn = pathname === basePath; // only when we are on the right page
        const showActive = activeOn && isActive;

        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={showActive}
            scroll={false}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
              showActive
                ? 'border-brand text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {tab.badge && tab.badge > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-danger-muted px-1.5 text-[10px] font-medium leading-5 text-danger">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
