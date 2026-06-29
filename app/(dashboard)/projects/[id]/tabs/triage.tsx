'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { ScoreBar } from '@/components/score-bar';
import { RunResults } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { formatRelative } from '@/lib/format';
import type { ReviewStatus, RunResult } from '@/lib/types';

type TriageRow = RunResult & {
  projectName: string;
  runs: { project_id: string; started_at: string };
};

type Props = {
  projectId: string;
  items: TriageRow[];
};

export function TriageTab({ items }: Props) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState title={COPY.triage.empty.title} body={COPY.triage.empty.body} />
      ) : (
        <div className="card overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {items.map((row) => (
              <TriageItem key={row.id} row={row} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TriageItem({ row }: { row: TriageRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function triage(review_status: Exclude<ReviewStatus, 'pending'>) {
    setError(null);
    startTransition(async () => {
      try {
        await RunResults.triage(row.id, { review_status });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted">
            <Link
              href={`/runs/${row.run_id}`}
              className="font-medium text-brand hover:underline"
            >
              View run
            </Link>
            <span>·</span>
            <span>{formatRelative(row.created_at)}</span>
          </div>
          <div className="mt-1 font-medium text-text">{row.question}</div>
          <div className="mt-1 line-clamp-2 text-sm text-textMuted">
            Expected: {row.expected_answer}
          </div>
          {row.actual_answer ? (
            <div className="mt-1 line-clamp-2 text-sm text-textMuted">
              Actual: {row.actual_answer}
            </div>
          ) : null}
          {row.judge_reasoning ? (
            <p className="mt-2 text-sm italic text-textMuted">
              “{row.judge_reasoning}”
            </p>
          ) : null}
          {error ? <p className="error-text mt-2">{error}</p> : null}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <ScoreBar
            score={row.judge_score}
            reasoning={row.judge_reasoning}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => triage('approved')}
              disabled={isPending}
            >
              {COPY.runDetail.actions.approve}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => triage('reverted')}
              disabled={isPending}
            >
              {COPY.runDetail.actions.revert}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => triage('accepted')}
              disabled={isPending}
            >
              {COPY.runDetail.actions.accept}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
