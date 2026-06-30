import Link from 'next/link';
import { getSupabaseServer, getSession } from '@/lib/supabase/server';
import { loadInbox } from '@/lib/inbox';
import { OnboardingForm } from './onboarding-form';
import { InboxList } from './inbox/inbox-list';
import { SeedSampleDataButton } from './inbox/seed-sample-data-button';
import { EmptyState } from '@/components/empty-state';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import { ArrowRightIcon } from '@/components/icons';

/**
 * Renders the dashboard inbox (or onboarding if the user has no org).
 * Pulled out of `app/(dashboard)/page.tsx` so it can be reused from the
 * root `/` page in `app/page.tsx`. Server component.
 */
export async function InboxHome() {
  const session = await getSession();
  if (!session) return null;

  const sb = await getSupabaseServer();
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();
  const orgId = membership?.org_id ?? null;
  if (!orgId) return <OnboardingForm />;

  const inbox = await loadInbox(orgId);
  const projects = await sb
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            {COPY.inbox.title}
          </h1>
          <p className="muted mt-1">
            {inbox.drifts.length === 0
              ? COPY.inbox.subtitleEmpty
              : COPY.inbox.subtitleWithCount(inbox.drifts.length)}
          </p>
        </div>
        {inbox.last_run_at ? (
          <p className="subtle num text-right">
            {COPY.inbox.lastRun(formatRelative(inbox.last_run_at))}
          </p>
        ) : null}
      </header>

      {inbox.project_count === 0 ? (
        <EmptyState
          title={COPY.inbox.noProjectsTitle}
          body={COPY.inbox.noProjectsBody}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/projects" className="btn-primary">
                {COPY.inbox.noProjectsCta}
                <ArrowRightIcon />
              </Link>
              <SeedSampleDataButton />
            </div>
          }
        />
      ) : inbox.drifts.length === 0 ? (
        <EmptyState
          icon={
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-brand" />
          }
          title={COPY.inbox.emptyTitle}
          body={COPY.inbox.emptyBody}
        />
      ) : (
        <InboxList
          initialDrifts={inbox.drifts}
          totalPending={inbox.total_pending}
          projects={projects.data ?? []}
        />
      )}
    </div>
  );
}