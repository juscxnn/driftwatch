import { getSupabaseServer } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server';
import { OrgTriageList } from './org-triage-list';
import { COPY } from '@/lib/copy';
import type { RunResult } from '@/lib/types';

type TriageRow = RunResult & {
  projectName: string;
  projectId: string;
  runs: { project_id: string; started_at: string };
};

async function loadOrgTriage(userId: string): Promise<TriageRow[]> {
  const sb = await getSupabaseServer();

  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const orgId = (membership?.org_id as string | undefined) ?? null;
  if (!orgId) return [];

  // Pull pending run_results that belong to the user's org. RLS limits the
  // results to orgs the user belongs to, so we don't need to filter again
  // here — but we do join to projects to get the project name.
  const { data } = await sb
    .from('run_results')
    .select(
      'id, run_id, question, expected_answer, actual_answer, judge_score, judge_reasoning, passed, latency_ms, review_status, golden_qa_id, reviewed_by, reviewed_at, created_at, runs!inner(project_id, started_at, project:projects(id, name, org_id))',
    )
    .eq('review_status', 'pending')
    .eq('runs.projects.org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  type Raw = RunResult & {
    runs: {
      project_id: string;
      started_at: string;
      project: { id: string; name: string; org_id: string } | { id: string; name: string; org_id: string }[];
    };
  };

  return ((data ?? []) as unknown as Raw[]).map((row) => {
    const projRel = row.runs?.project;
    const project = Array.isArray(projRel) ? projRel[0] : projRel;
    return {
      ...row,
      projectId: project?.id ?? '',
      projectName: project?.name ?? 'Unknown project',
    };
  });
}

export default async function OrgTriagePage() {
  const session = await getSession();
  if (!session) return null;
  const rows = await loadOrgTriage(session.user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {COPY.triage.title}
        </h1>
        <p className="muted">{COPY.triage.subtitle}</p>
      </div>
      <OrgTriageList initial={rows} />
    </div>
  );
}
