'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ScoreBar } from '@/components/score-bar';
import { RunResults } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import type { ReviewStatus, RunResult } from '@/lib/types';

type TriageRow = RunResult & {
  projectName: string;
  projectId: string;
};

type Props = {
  initial: TriageRow[];
};

export function OrgTriageList({ initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<TriageRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function triage(id: string, review_status: Exclude<ReviewStatus, 'pending'>) {
    setError(null);
    setRows((rs) => rs.filter((r) => r.id !== id));
    startTransition(async () => {
      try {
        await RunResults.triage(id, { review_status });
        router.refresh();
      } catch (err) {
        setRows(initial);
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={COPY.triage.empty.title}
        body={COPY.triage.empty.body}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="error-text rounded-md border border-danger bg-danger-muted px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <DataTable<TriageRow>
        rows={rows}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'score', direction: 'asc' }}
        columns={[
          {
            key: 'score',
            header: COPY.triage.columns.question,
            sortBy: (row) => row.judge_score ?? Number.POSITIVE_INFINITY,
            cell: (row) => <TriageCell row={row} />,
          },
          {
            key: 'actions',
            header: COPY.triage.columns.actions,
            className: 'w-56',
            cell: (row) => (
              <TriageActions
                row={row}
                isPending={isPending}
                onTriage={(status) => triage(row.id, status)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function TriageCell({ row }: { row: TriageRow }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <Link
          href={row.projectId ? `/projects/${row.projectId}` : '/'}
          className="font-medium text-brand hover:text-brand-hover hover:underline"
        >
          {row.projectName}
        </Link>
        <span>·</span>
        <Link href={`/runs/${row.run_id}`} className="hover:underline">
          <span className="num">Run {row.run_id.slice(0, 8)}</span>
        </Link>
        <span>·</span>
        <span>{formatRelative(row.created_at)}</span>
      </div>
      <div className="font-medium text-text">{row.question}</div>
      <div className="line-clamp-2 text-sm text-text-muted">
        Expected: {row.expected_answer}
      </div>
      {row.actual_answer ? (
        <div className="line-clamp-2 text-sm text-text-muted">
          Actual: {row.actual_answer}
        </div>
      ) : null}
      {row.judge_reasoning ? (
        <p className="text-sm italic text-text-muted">
          &ldquo;{row.judge_reasoning}&rdquo;
        </p>
      ) : null}
    </div>
  );
}

function TriageActions({
  row,
  isPending,
  onTriage,
}: {
  row: TriageRow;
  isPending: boolean;
  onTriage: (status: Exclude<ReviewStatus, 'pending'>) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <ScoreBar score={row.judge_score} reasoning={row.judge_reasoning} />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('approved')}
          disabled={isPending}
        >
          {COPY.runDetail.actions.approve}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('reverted')}
          disabled={isPending}
        >
          {COPY.runDetail.actions.revert}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('accepted')}
          disabled={isPending}
        >
          {COPY.runDetail.actions.accept}
        </button>
      </div>
    </div>
  );
}
