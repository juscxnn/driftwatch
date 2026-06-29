import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server';
import { RunResultsList } from './run-results-list';
import { StatusBadge } from '@/components/status-badge';
import { COPY } from '@/lib/copy';
import { formatDate, formatPercent } from '@/lib/format';
import type { Project, Run, RunResult } from '@/lib/types';

type PageProps = { params: Promise<{ id: string }> };

export default async function RunDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sb = await getSupabaseServer();

  const { data: run } = await sb
    .from('runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!run) notFound();
  const runRow = run as Run;

  // Verify access via the project's org.
  const { data: project } = await sb
    .from('projects')
    .select('*')
    .eq('id', runRow.project_id)
    .maybeSingle();
  if (!project) notFound();
  const projectRow = project as Project;
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', session.user.id)
    .eq('org_id', projectRow.org_id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: resultsData } = await sb
    .from('run_results')
    .select('*')
    .eq('run_id', id)
    .order('created_at', { ascending: true });
  const results = (resultsData ?? []) as RunResult[];

  const passRate = runRow.total > 0 ? runRow.passed / runRow.total : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="muted">
          <Link
            href={`/projects/${projectRow.id}`}
            className="hover:underline"
          >
            {projectRow.name}
          </Link>{' '}
          / Runs
        </div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Run</h1>
            <p className="muted">
              {formatDate(runRow.started_at)} ·{' '}
              {runRow.triggered_by.replace('_', ' ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge kind="run" value={runRow.status} />
            <span className="muted">
              {runRow.passed}/{runRow.total} passed ·{' '}
              {runRow.total > 0 ? formatPercent(runRow.passed, runRow.total) : '—'}
            </span>
          </div>
        </div>
        {runRow.error ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {runRow.error}
          </p>
        ) : null}
      </div>

      <RunResultsList runId={runRow.id} initial={results} />
    </div>
  );
}
