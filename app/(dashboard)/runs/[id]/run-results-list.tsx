'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/data-table';
import { ScoreBar } from '@/components/score-bar';
import { StatusBadge } from '@/components/status-badge';
import { RunResults } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { formatLatency } from '@/lib/format';
import type { ReviewStatus, RunResult } from '@/lib/types';

type Props = {
  runId: string;
  initial: RunResult[];
};

export function RunResultsList({ initial }: Props) {
  const router = useRouter();
  const [results, setResults] = useState<RunResult[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function triage(id: string, review_status: Exclude<ReviewStatus, 'pending'>) {
    setError(null);
    setResults((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              review_status,
              reviewed_at: new Date().toISOString(),
            }
          : r,
      ),
    );
    startTransition(async () => {
      try {
        await RunResults.triage(id, { review_status });
        router.refresh();
      } catch (err) {
        setResults(initial);
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  if (results.length === 0) {
    return (
      <p className="muted">
        This run produced no results. (It may still be in progress.)
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="error-text rounded-md border border-danger bg-danger-muted px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <DataTable<RunResult>
        rows={results}
        rowKey={(r) => r.id}
        defaultSort={{ key: 'score', direction: 'desc' }}
        columns={[
          {
            key: 'score',
            header: COPY.runDetail.columns.question,
            sortBy: (r) => r.judge_score ?? Number.NEGATIVE_INFINITY,
            cell: (r) => <ResultCell result={r} />,
          },
          {
            key: 'actions',
            header: 'Review',
            className: 'w-56',
            cell: (r) => (
              <ResultActions
                result={r}
                isPending={isPending}
                onTriage={(status) => triage(r.id, status)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function ResultCell({ result: r }: { result: RunResult }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="passed" value={r.passed} />
        <StatusBadge kind="review" value={r.review_status} />
        <span className="muted text-xs">{formatLatency(r.latency_ms)}</span>
      </div>
      <div className="font-medium text-text">{r.question}</div>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Field label="Expected" value={r.expected_answer} />
        <Field label="Actual" value={r.actual_answer ?? '—'} />
      </div>
      {r.judge_reasoning ? (
        <p className="text-sm italic text-text-muted">
          &ldquo;{r.judge_reasoning}&rdquo;
        </p>
      ) : null}
    </div>
  );
}

function ResultActions({
  result,
  isPending,
  onTriage,
}: {
  result: RunResult;
  isPending: boolean;
  onTriage: (status: Exclude<ReviewStatus, 'pending'>) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <ScoreBar score={result.judge_score} reasoning={result.judge_reasoning} />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('approved')}
          disabled={isPending || result.review_status !== 'pending'}
        >
          {COPY.runDetail.actions.approve}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('reverted')}
          disabled={isPending || result.review_status !== 'pending'}
        >
          {COPY.runDetail.actions.revert}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTriage('accepted')}
          disabled={isPending || result.review_status !== 'pending'}
        >
          {COPY.runDetail.actions.accept}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-text">{value}</div>
    </div>
  );
}
