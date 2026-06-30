'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/button';
import { ArrowRightIcon, PlusIcon } from '@/components/icons';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import type { Project, Run } from '@/lib/types';

type ProjectRow = {
  project: Project;
  lastRun: Run | null;
};

async function loadProjects(): Promise<ProjectRow[]> {
  const sb = getSupabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data: membership } = await sb
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
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

  return Promise.all(
    projects.map(async (project) => {
      const { data: runsData } = await sb
        .from('runs')
        .select('*')
        .eq('project_id', project.id)
        .order('started_at', { ascending: false })
        .limit(1);
      return { project, lastRun: (runsData?.[0] as Run | undefined) ?? null };
    }),
  );
}

export default function ProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadProjects()
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
          <p className="muted">One project per RAG system you want to watch.</p>
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-text">Add a new project to watch.</p>
          <p className="muted">
            Point Driftwatch at a RAG endpoint, pick a judge model, and seed
            a starter set of golden Q&amp;As.
          </p>
        </div>
        <Button
          asChild
          variant="primary"
        >
          <Link href="/projects/new" className="inline-flex items-center gap-2">
            <PlusIcon aria-hidden />
            <span>New project</span>
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </div>

      <DataTable<ProjectRow>
        rows={rows}
        rowKey={(row) => row.project.id}
        defaultSort={{ key: 'name', direction: 'asc' }}
        isLoading={!loaded}
        search={{
          placeholder: 'Search projects…',
          value: searchQuery,
          onChange: setSearchQuery,
          match: (row, q) => {
            const needle = q.toLowerCase();
            return (
              row.project.name.toLowerCase().includes(needle) ||
              (row.project.rag_endpoint_url?.toLowerCase().includes(needle) ?? false)
            );
          },
        }}
        emptyState={
          <EmptyState
            title={COPY.home.noProjects.title}
            body={COPY.home.noProjects.body}
          />
        }
        columns={[
          {
            key: 'name',
            header: 'Name',
            sortBy: (row) => row.project.name.toLowerCase(),
            cell: (row) => (
              <Link
                href={`/projects/${row.project.id}`}
                className="font-medium hover:underline"
              >
                {row.project.name}
              </Link>
            ),
          },
          {
            key: 'endpoint',
            header: 'RAG endpoint',
            cell: (row) => (
              <span className="text-text-muted">
                {row.project.rag_endpoint_url ?? '—'}
              </span>
            ),
          },
          {
            key: 'lastrun',
            header: 'Last run',
            cell: (row) =>
              row.lastRun ? (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge kind="run" value={row.lastRun.status} />
                  <span className="muted">{formatRelative(row.lastRun.started_at)}</span>
                </span>
              ) : (
                <span className="muted">{COPY.overview.neverRun}</span>
              ),
          },
          {
            key: 'passrate',
            header: 'Pass rate',
            sortBy: (row) =>
              row.lastRun && row.lastRun.total > 0
                ? row.lastRun.passed / row.lastRun.total
                : -1,
            cell: (row) =>
              row.lastRun && row.lastRun.total > 0
                ? `${Math.round((row.lastRun.passed / row.lastRun.total) * 100)}% (${row.lastRun.passed}/${row.lastRun.total})`
                : '—',
          },
          {
            key: 'action',
            header: COPY.projects.columnAction,
            className: 'text-right',
            cell: (row) => (
              <Link
                href={`/projects/${row.project.id}`}
                className="text-brand hover:text-brand-hover hover:underline"
              >
                {COPY.projects.rowAction}
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
