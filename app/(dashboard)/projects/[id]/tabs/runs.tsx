'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Runs } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { formatDate, formatPercent } from '@/lib/format';
import type { Run } from '@/lib/types';

type RunsTabProps = {
  projectId: string;
  items: Run[];
};

export function RunsTab({ projectId, items }: RunsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="muted">
          {items.length === 0
            ? 'No runs yet. Trigger one to test your current golden Q&A suite.'
            : `Showing the last ${items.length} ${items.length === 1 ? 'run' : 'runs'}.`}
        </p>
        <TriggerButton projectId={projectId} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={COPY.runs.empty.title}
          body={COPY.runs.empty.body}
        />
      ) : (
        <DataTable<Run>
          rows={items}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'started', direction: 'desc' }}
          columns={[
            {
              key: 'started',
              header: COPY.runs.columns.started,
              sortBy: (r) => r.started_at,
              cell: (r) => (
                <span className="text-text-muted">{formatDate(r.started_at)}</span>
              ),
            },
            {
              key: 'status',
              header: COPY.runs.columns.status,
              cell: (r) => <StatusBadge kind="run" value={r.status} />,
            },
            {
              key: 'total',
              header: COPY.runs.columns.total,
              className: 'w-16',
              cell: (r) => <span>{r.total}</span>,
            },
            {
              key: 'passed',
              header: COPY.runs.columns.passed,
              className: 'w-16',
              cell: (r) => <span className="text-success">{r.passed}</span>,
            },
            {
              key: 'failed',
              header: COPY.runs.columns.failed,
              className: 'w-16',
              cell: (r) => <span className="text-danger">{r.failed}</span>,
            },
            {
              key: 'triggeredBy',
              header: COPY.runs.columns.triggeredBy,
              cell: (r) => (
                <span className="text-text-muted">{r.triggered_by}</span>
              ),
            },
            {
              key: 'action',
              header: COPY.projects.columnAction,
              className: 'w-24 text-right',
              cell: (r) => (
                <Link
                  href={`/runs/${r.id}`}
                  className="text-brand hover:text-brand-hover hover:underline"
                >
                  {COPY.projects.rowAction}
                </Link>
              ),
            },
          ]}
        />
      )}

      {items.length > 0 ? (
        <p className="muted text-center">
          Pass rate (latest):{' '}
          {items[0] && items[0].total > 0
            ? formatPercent(items[0].passed, items[0].total)
            : '—'}
        </p>
      ) : null}
    </div>
  );
}

function TriggerButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await Runs.trigger(projectId);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToTrigger);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="error-text">{error}</span> : null}
      <button
        type="button"
        className="btn-primary"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? COPY.runs.triggering : COPY.runs.triggerCta}
      </button>
    </div>
  );
}
