import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server';
import { NewProjectForm } from './new-project-form';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import type { Project, Run } from '@/lib/types';

type ProjectRow = {
  project: Project;
  lastRun: Run | null;
};

async function loadProjects(userId: string): Promise<ProjectRow[]> {
  const sb = await getSupabaseServer();

  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const orgId = (membership?.org_id as string | undefined) ?? null;
  if (!orgId) return [];

  const { data: projectsData } = await sb
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  const projects = (projectsData ?? []) as Project[];

  const rows: ProjectRow[] = await Promise.all(
    projects.map(async (project) => {
      const { data: runsData } = await sb
        .from('runs')
        .select('*')
        .eq('project_id', project.id)
        .order('started_at', { ascending: false })
        .limit(1);
      const lastRun = (runsData?.[0] as Run | undefined) ?? null;
      return { project, lastRun };
    }),
  );
  return rows;
}

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await loadProjects(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="muted">One project per RAG system you want to watch.</p>
        </div>
      </div>

      <NewProjectForm />

      {rows.length === 0 ? (
        <EmptyState
          title={COPY.home.noProjects.title}
          body={COPY.home.noProjects.body}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surfaceMuted text-left text-textMuted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">RAG endpoint</th>
                <th className="px-4 py-2 font-medium">Last run</th>
                <th className="px-4 py-2 font-medium">Pass rate</th>
                <th className="px-4 py-2 font-medium sr-only">{COPY.projects.columnAction}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, lastRun }) => (
                <tr key={project.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-textMuted">
                    {project.rag_endpoint_url ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lastRun ? (
                      <span className="inline-flex items-center gap-2">
                        <StatusBadge kind="run" value={lastRun.status} />
                        <span className="muted">{formatRelative(lastRun.started_at)}</span>
                      </span>
                    ) : (
                      <span className="muted">{COPY.overview.neverRun}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lastRun && lastRun.total > 0
                      ? `${Math.round((lastRun.passed / lastRun.total) * 100)}% (${lastRun.passed}/${lastRun.total})`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-brand hover:underline"
                    >
                      {COPY.projects.rowAction}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
