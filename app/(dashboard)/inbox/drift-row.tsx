'use client';

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';
import type { InboxDrift } from '@/lib/types';
import { COPY } from '@/lib/copy';
import { formatLatency, formatRelative, formatScore } from '@/lib/format';
import { triageRunResultAction } from './actions';

const THRESHOLD = 0.7;

type DriftRowProps = { drift: InboxDrift };

type ActionKey = 'approve' | 'reverted' | 'accepted';

const ACTION_LABELS: Record<ActionKey, string> = {
  approve: COPY.inbox.actions.approve,
  reverted: COPY.inbox.actions.reword,
  accepted: COPY.inbox.actions.escalate,
};

function scoreColorClass(score: number | null): string {
  if (score == null) return 'text-text-subtle';
  if (score < 0.5) return 'text-danger';
  if (score < THRESHOLD) return 'text-warn';
  return 'text-text-muted';
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
      {children}
    </span>
  );
}

export function DriftRow({ drift }: DriftRowProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAction(action: ActionKey) {
    if (isPending) return;
    setError(null);
    setPendingAction(action);
    startTransition(async () => {
      const result = await triageRunResultAction(drift.run_result_id, action);
      setPendingAction(null);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <article className="card space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-warn" />
        <Link href={`/projects/${drift.project_id}`} className="text-text hover:underline">
          {drift.project_name}
        </Link>
        <span className="text-text-subtle">·</span>
        <span className="muted">{formatRelative(drift.created_at)}</span>
      </div>

      <p className="text-text">{drift.question}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt>
          <FieldLabel>{COPY.inbox.expectedLabel}</FieldLabel>
        </dt>
        <dd className="text-text">{drift.expected_answer}</dd>
        <dt>
          <FieldLabel>{COPY.inbox.actualLabel}</FieldLabel>
        </dt>
        <dd className="text-text-muted">{drift.actual_answer ?? '—'}</dd>
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="flex items-baseline gap-2">
          <FieldLabel>{COPY.inbox.scoreLabel}</FieldLabel>
          <span className={`num ${scoreColorClass(drift.judge_score)}`}>
            {formatScore(drift.judge_score)}
          </span>
        </span>
        <span className="text-text-subtle">·</span>
        <span className="flex items-baseline gap-2">
          <FieldLabel>{COPY.inbox.latencyLabel}</FieldLabel>
          <span className="num text-text-muted">
            {formatLatency(drift.latency_ms)}
          </span>
        </span>
      </div>

      {drift.judge_reasoning ? (
        <p className="text-sm italic text-text-muted">
          &ldquo;{drift.judge_reasoning}&rdquo;
        </p>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleAction('approve')}
          disabled={isPending}
          aria-busy={isPending && pendingAction === 'approve'}
        >
          {isPending && pendingAction === 'approve' ? 'Approving…' : ACTION_LABELS.approve}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleAction('reverted')}
          disabled={isPending}
          aria-busy={isPending && pendingAction === 'reverted'}
        >
          {isPending && pendingAction === 'reverted' ? 'Saving…' : ACTION_LABELS.reverted}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => handleAction('accepted')}
          disabled={isPending}
          aria-busy={isPending && pendingAction === 'accepted'}
        >
          {isPending && pendingAction === 'accepted' ? 'Saving…' : ACTION_LABELS.accepted}
        </button>
      </div>
    </article>
  );
}