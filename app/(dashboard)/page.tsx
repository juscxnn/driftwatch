import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import type { Project, Run } from '@/lib/types';

type ProjectSummary = {
  project: Project;
  lastRun: Run | null;
  pendingCount: number;
};

async function loadDashboardData(userId: string): Promise<{
  orgId: string | null;
  projects: ProjectSummary[];
  totalPending: number;
}> {
  const sb = await getSupabaseServer();

  // Find the user's first org.
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const orgId = (membership?.org_id as string | undefined) ?? null;
  if (!orgId) return { orgId: null, projects: [], totalPending: 0 };

  const { data: projectsData } = await sb
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  const projects = (projectsData ?? []) as Project[];

  const summaries: ProjectSummary[] = await Promise.all(
    projects.map(async (project) => {
      const { data: runsData } = await sb
        .from('runs')
        .select('*')
        .eq('project_id', project.id)
        .order('started_at', { ascending: false })
        .limit(1);
      const lastRun = (runsData?.[0] as Run | undefined) ?? null;

      const { count: pendingCount } = await sb
        .from('run_results')
        .select('id, runs!inner(project_id)', { count: 'exact', head: true })
        .eq('review_status', 'pending')
        .eq('runs.project_id', project.id);

      return { project, lastRun, pendingCount: pendingCount ?? 0 };
    }),
  );

  const totalPending = summaries.reduce((acc, s) => acc + s.pendingCount, 0);

  return { orgId, projects: summaries, totalPending };
}

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) return null; // layout redirects
  const { orgId, projects, totalPending } = await loadDashboardData(session.user.id);

  if (!orgId) {
    return (
      <EmptyState
        title="No organization yet"
        body="Your account is not linked to an organization. Contact support@ragdrift.example."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{COPY.home.title}</h1>
          <p className="muted">
            {totalPending > 0
              ? `${totalPending} ${COPY.home.pendingReviews}`
              : 'No pending reviews — your RAG is behaving.'}
          </p>
        </div>
        <Link href="/projects" className="btn-primary">
          {COPY.home.newProjectCta}
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title={COPY.home.noProjects.title}
          body={COPY.home.noProjects.body}
          action={
            <Link href="/projects" className="btn-primary">
              {COPY.home.noProjects.cta}
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map(({ project, lastRun, pendingCount }) => (
            <li key={project.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-base font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="muted line-clamp-1">
                    {project.rag_endpoint_url ?? 'No RAG endpoint configured'}
                  </p>
                </div>
                {pendingCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-textMuted">Last run</dt>
                  <dd className="font-medium">
                    {lastRun ? (
                      <span className="inline-flex items-center gap-2">
                        <StatusBadge kind="run" value={lastRun.status} />
                        <span className="text-textMuted">
                          {formatRelative(lastRun.started_at)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-textMuted">{COPY.overview.neverRun}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-textMuted">Pass rate</dt>
                  <dd className="font-medium">
                    {lastRun && lastRun.total > 0
                      ? `${Math.round((lastRun.passed / lastRun.total) * 100)}% (${lastRun.passed}/${lastRun.total})`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
