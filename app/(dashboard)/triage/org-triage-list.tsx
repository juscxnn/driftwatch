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
        // Re-fetch
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
    <div className="card overflow-hidden p-0">
      {error ? <p className="error-text border-b border-border px-4 py-2">{error}</p> : null}
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <Link
                    href={row.projectId ? `/projects/${row.projectId}` : '/'}
                    className="font-medium text-brand hover:text-brand-hover hover:underline"
                  >
                    {row.projectName}
                  </Link>
                  <span>·</span>
                  <Link
                    href={`/runs/${row.run_id}`}
                    className="hover:underline"
                  >
                    <span className="num">Run {row.run_id.slice(0, 8)}</span>
                  </Link>
                  <span>·</span>
                  <span>{formatRelative(row.created_at)}</span>
                </div>
                <div className="mt-1 font-medium text-text">{row.question}</div>
                <div className="mt-1 line-clamp-2 text-sm text-text-muted">
                  Expected: {row.expected_answer}
                </div>
                {row.actual_answer ? (
                  <div className="mt-1 line-clamp-2 text-sm text-text-muted">
                    Actual: {row.actual_answer}
                  </div>
                ) : null}
                {row.judge_reasoning ? (
                  <p className="mt-2 text-sm italic text-text-muted">
                    “{row.judge_reasoning}”
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <ScoreBar
                  score={row.judge_score}
                  reasoning={row.judge_reasoning}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(row.id, 'approved')}
                    disabled={isPending}
                  >
                    {COPY.runDetail.actions.approve}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(row.id, 'reverted')}
                    disabled={isPending}
                  >
                    {COPY.runDetail.actions.revert}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(row.id, 'accepted')}
                    disabled={isPending}
                  >
                    {COPY.runDetail.actions.accept}
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
