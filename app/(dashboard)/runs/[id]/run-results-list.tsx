'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
    // Optimistic update
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
        // Revert
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
    <div className="card overflow-hidden p-0">
      {error ? <p className="error-text border-b border-border px-4 py-2">{error}</p> : null}
      <ul className="divide-y divide-border">
        {results.map((r) => (
          <li key={r.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="passed" value={r.passed} />
                  <StatusBadge kind="review" value={r.review_status} />
                  <span className="muted text-xs">
                    {formatLatency(r.latency_ms)}
                  </span>
                </div>
                <div className="mt-2 font-medium text-text">{r.question}</div>
                <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <Field label="Expected" value={r.expected_answer} />
                  <Field label="Actual" value={r.actual_answer ?? '—'} />
                </div>
                {r.judge_reasoning ? (
                  <p className="mt-2 text-sm italic text-textMuted">
                    “{r.judge_reasoning}”
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <ScoreBar
                  score={r.judge_score}
                  reasoning={r.judge_reasoning}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(r.id, 'approved')}
                    disabled={isPending || r.review_status !== 'pending'}
                  >
                    {COPY.runDetail.actions.approve}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(r.id, 'reverted')}
                    disabled={isPending || r.review_status !== 'pending'}
                  >
                    {COPY.runDetail.actions.revert}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => triage(r.id, 'accepted')}
                    disabled={isPending || r.review_status !== 'pending'}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-text">{value}</div>
    </div>
  );
}
