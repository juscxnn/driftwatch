import { getSupabaseServer, getSession } from '@/lib/supabase/server';
import { loadInbox } from '@/lib/inbox';
import { OnboardingForm } from './onboarding-form';
import { DriftRow } from './inbox/drift-row';
import { EmptyState } from '@/components/empty-state';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function HealthyDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full bg-brand"
    />
  );
}

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) return null; // layout redirects to /login

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

      {inbox.drifts.length === 0 ? (
        <EmptyState
          icon={<HealthyDot />}
          title={COPY.inbox.emptyTitle}
          body={COPY.inbox.emptyBody}
        />
      ) : (
        <ul className="space-y-3">
          {inbox.drifts.map((d) => (
            <li key={d.run_result_id}>
              <DriftRow drift={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
