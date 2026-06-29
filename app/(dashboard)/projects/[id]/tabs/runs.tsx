'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.started}</th>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.status}</th>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.total}</th>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.passed}</th>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.failed}</th>
                <th className="px-4 py-2 font-medium">{COPY.runs.columns.triggeredBy}</th>
                <th className="px-4 py-2 font-medium sr-only">{COPY.projects.columnAction}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((run) => (
                <tr key={run.id} className="border-t border-border">
                  <td className="px-4 py-3 text-text-muted">{formatDate(run.started_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge kind="run" value={run.status} />
                  </td>
                  <td className="px-4 py-3">{run.total}</td>
                  <td className="px-4 py-3 text-success">{run.passed}</td>
                  <td className="px-4 py-3 text-danger">{run.failed}</td>
                  <td className="px-4 py-3 text-text-muted">{run.triggered_by}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-brand hover:text-brand-hover hover:underline"
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
