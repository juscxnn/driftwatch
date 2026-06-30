import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { getSession, getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type DashboardShellContext = {
  email: string | null;
  orgName: string | null;
  driftCount: number;
  reviewCount: number;
};

/**
 * Fetches the data the sidebar needs in one place so callers don't each
 * have to roundtrip through Supabase.
 *
 * Returns `null` when the user has no active session — callers can branch.
 */
export async function loadDashboardContext(): Promise<DashboardShellContext | null> {
  const session = await getSession();
  if (!session) return null;

  const sb = await getSupabaseServer();
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id, organizations(name)')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  const orgRel = membership?.organizations as { name: string } | { name: string }[] | null;
  const orgName = Array.isArray(orgRel) ? (orgRel[0]?.name ?? null) : (orgRel?.name ?? null);
  const orgId = (membership?.org_id as string | undefined) ?? null;

  let driftCount = 0;
  let reviewCount = 0;
  if (orgId) {
    const { count: pending } = await sb
      .from('run_results')
      .select('id, runs!inner(project_id, projects!inner(org_id))', {
        count: 'exact',
        head: true,
      })
      .eq('review_status', 'pending')
      .eq('runs.projects.org_id', orgId);
    driftCount = pending ?? 0;
    reviewCount = driftCount;
  }

  return {
    email: session.email,
    orgName,
    driftCount,
    reviewCount,
  };
}

type DashboardShellProps = {
  context: DashboardShellContext;
  children: ReactNode;
};

/**
 * Server component wrapper that renders the persistent left sidebar
 * (desktop) + top bar (mobile) around page content. Use this in any
 * authenticated layout/page so the nav stays consistent.
 *
 * On mobile (`<md`), a slim top bar with the logo + sign-out is rendered
 * in place of the sidebar.
 */
export function DashboardShell({ context, children }: DashboardShellProps) {
  const { email, orgName, driftCount, reviewCount } = context;
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        email={email}
        orgName={orgName}
        driftCount={driftCount}
        reviewCount={reviewCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          email={email}
          orgName={orgName}
          driftCount={driftCount}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileTopBar({
  email,
  orgName,
  driftCount,
}: {
  email: string | null;
  orgName: string | null;
  driftCount: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="inline-block h-5 w-5 rounded-md bg-brand" />
        <span className="truncate text-sm font-medium tracking-tight">
          {orgName ?? 'Driftwatch'}
        </span>
        {driftCount > 0 ? (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-danger-muted px-1.5 text-[10px] font-medium leading-5 text-danger">
            {driftCount > 99 ? '99+' : driftCount}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {email ? <span className="hidden truncate sm:inline">{email}</span> : null}
      </div>
    </header>
  );
}