import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server';
import { TabNav } from '@/components/tab-nav';
import { OverviewTab } from './tabs/overview';
import { GoldenTab } from './tabs/golden';
import { SourcesTab } from './tabs/sources';
import { RunsTab } from './tabs/runs';
import { TriageTab } from './tabs/triage';
import { COPY } from '@/lib/copy';
import type {
  GoldenQA,
  Project,
  Run,
  RunResult,
  Source,
} from '@/lib/types';

const TABS = ['overview', 'golden', 'sources', 'runs', 'triage'] as const;
type TabKey = (typeof TABS)[number];

function parseTab(raw: string | undefined): TabKey {
  if (raw && (TABS as readonly string[]).includes(raw)) {
    return raw as TabKey;
  }
  return 'overview';
}

async function loadProject(projectId: string, userId: string) {
  const sb = await getSupabaseServer();

  const { data: project } = await sb
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;

  // Verify the user belongs to the org that owns this project.
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('org_id', (project as Project).org_id)
    .maybeSingle();
  if (!membership) return null;

  return project as Project;
}

async function loadTabData(projectId: string, tab: TabKey) {
  const sb = await getSupabaseServer();
  switch (tab) {
    case 'overview': {
      const [runsRes, sourcesRes, pendingRes] = await Promise.all([
        sb
          .from('runs')
          .select('*')
          .eq('project_id', projectId)
          .order('started_at', { ascending: false })
          .limit(20),
        sb
          .from('sources')
          .select('id, last_hash, last_fetched_at, title, uri, kind')
          .eq('project_id', projectId),
        sb
          .from('run_results')
          .select('id, runs!inner(project_id)', { count: 'exact', head: true })
          .eq('review_status', 'pending')
          .eq('runs.project_id', projectId),
      ]);
      return {
        kind: 'overview' as const,
        runs: (runsRes.data ?? []) as Run[],
        sources: (sourcesRes.data ?? []) as Pick<
          Source,
          'id' | 'last_hash' | 'last_fetched_at' | 'title' | 'uri' | 'kind'
        >[],
        pendingCount: pendingRes.count ?? 0,
      };
    }
    case 'golden': {
      const { data } = await sb
        .from('golden_qa')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return { kind: 'golden' as const, items: (data ?? []) as GoldenQA[] };
    }
    case 'sources': {
      const { data } = await sb
        .from('sources')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return { kind: 'sources' as const, items: (data ?? []) as Source[] };
    }
    case 'runs': {
      const { data } = await sb
        .from('runs')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(50);
      return { kind: 'runs' as const, items: (data ?? []) as Run[] };
    }
    case 'triage': {
      const { data } = await sb
        .from('run_results')
        .select('id, run_id, question, expected_answer, actual_answer, judge_score, judge_reasoning, passed, latency_ms, review_status, golden_qa_id, runs!inner(project_id, started_at, project:projects(name))')
        .eq('review_status', 'pending')
        .eq('runs.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);
      type Row = RunResult & {
        runs: { project_id: string; started_at: string; project: { name: string } | { name: string }[] };
      };
      return {
        kind: 'triage' as const,
        items: ((data ?? []) as unknown as Row[]).map((row) => {
          const projRel = row.runs?.project;
          const projectName = Array.isArray(projRel) ? projRel[0]?.name ?? '' : projRel?.name ?? '';
          return { ...row, projectName };
        }),
      };
    }
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;
  const tab = parseTab(typeof sp.tab === 'string' ? sp.tab : undefined);

  const project = await loadProject(id, session.user.id);
  if (!project) notFound();

  const data = await loadTabData(id, tab);

  // Compute pending count for the tab nav badge.
  let pendingBadge = 0;
  if (tab === 'overview') {
    pendingBadge = (data as { pendingCount: number }).pendingCount;
  } else {
    const { count } = await (await getSupabaseServer())
      .from('run_results')
      .select('id, runs!inner(project_id)', { count: 'exact', head: true })
      .eq('review_status', 'pending')
      .eq('runs.project_id', id);
    pendingBadge = count ?? 0;
  }

  const basePath = `/projects/${id}`;
  const tabs = [
    { key: 'overview', label: COPY.tabs.overview, href: basePath },
    { key: 'golden', label: COPY.tabs.golden, href: basePath },
    { key: 'sources', label: COPY.tabs.sources, href: basePath },
    { key: 'runs', label: COPY.tabs.runs, href: basePath },
    { key: 'triage', label: COPY.tabs.triage, href: basePath, badge: pendingBadge },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="muted">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>{' '}
            /
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="muted">
            {project.rag_endpoint_url ?? 'No RAG endpoint configured'}
          </p>
        </div>
      </div>

      <TabNav tabs={tabs} basePath={basePath} paramName="tab" />

      <div>
        {tab === 'overview' && data.kind === 'overview' ? (
          <OverviewTab
            project={project}
            runs={data.runs}
            sources={data.sources}
            pendingCount={data.pendingCount}
          />
        ) : null}
        {tab === 'golden' && data.kind === 'golden' ? (
          <GoldenTab projectId={project.id} items={data.items} />
        ) : null}
        {tab === 'sources' && data.kind === 'sources' ? (
          <SourcesTab projectId={project.id} items={data.items} />
        ) : null}
        {tab === 'runs' && data.kind === 'runs' ? (
          <RunsTab projectId={project.id} items={data.items} />
        ) : null}
        {tab === 'triage' && data.kind === 'triage' ? (
          <TriageTab projectId={project.id} items={data.items} />
        ) : null}
      </div>
    </div>
  );
}
