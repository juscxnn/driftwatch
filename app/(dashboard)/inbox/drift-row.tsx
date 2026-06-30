'use client';

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';
import type { InboxDrift } from '@/lib/types';
import { COPY } from '@/lib/copy';
import { formatLatency, formatRelative, formatScore } from '@/lib/format';
import { toast } from '@/components/toast';
import { triageRunResultAction } from './actions';
import { RewordEditor } from './reword-editor';

const THRESHOLD = 0.7;

type DriftRowProps = {
  drift: InboxDrift;
  /** When true, apply the focused/selected visual treatment (subtle brand
   * border + ring) — used by the keyboard-shortcut layer. */
  selected?: boolean;
  /** Notify the parent that the user clicked Reword so it can track which
   * row is in reword mode (only one at a time). */
  onRewordClick?: (runResultId: string) => void;
  /** True when this row is the one in reword mode. When set, the row keeps
   * the editor expanded below its content. */
  rewordMode?: boolean;
  /** Called after a triage action (approve / escalate) or a successful
   * reword save — the parent should remove this row from its list. */
  onRemoved?: (runResultId: string) => void;
  /** Called when a triage action fails — parent should re-insert the row. */
  onActionFailed?: (runResultId: string) => void;
};

type ActionKey = 'approve' | 'reverted' | 'accepted';

const ACTION_LABELS: Record<ActionKey, string> = {
  approve: COPY.inbox.actions.approve,
  reverted: COPY.inbox.actions.reword,
  accepted: COPY.inbox.actions.escalate,
};

const ERROR_TITLES: Record<ActionKey, string> = {
  approve: COPY.inbox.triageErrors.approve,
  reverted: COPY.inbox.triageErrors.reword,
  accepted: COPY.inbox.triageErrors.escalate,
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

export function DriftRow({
  drift,
  selected = false,
  onRewordClick,
  rewordMode = false,
  onRemoved,
  onActionFailed,
}: DriftRowProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimistic triage for approve / escalate: remove from list immediately,
  // call the action, restore on failure.
  function handleDirectAction(action: Exclude<ActionKey, 'reverted'>) {
    if (isPending) return;
    setError(null);
    setPendingAction(action);
    onRemoved?.(drift.run_result_id);
    startTransition(async () => {
      const result = await triageRunResultAction(drift.run_result_id, action);
      setPendingAction(null);
      if (!result.ok) {
        // Bring the row back and surface a toast.
        onActionFailed?.(drift.run_result_id);
        setError(result.error);
        toast.error(ERROR_TITLES[action], result.error);
      }
    });
  }

  function handleRewordClick() {
    if (isPending) return;
    setError(null);
    onRewordClick?.(drift.run_result_id);
  }

  function handleRewordSaved() {
    onRemoved?.(drift.run_result_id);
  }

  function handleRewordCancel() {
    onRewordClick?.(''); // parent interprets empty as "no row in reword mode"
  }

  const articleClass = [
    'card space-y-4 transition-colors duration-100',
    selected ? 'border-brand ring-1 ring-brand/40' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={articleClass}>
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
          onClick={() => handleDirectAction('approve')}
          disabled={isPending || rewordMode}
          aria-busy={isPending && pendingAction === 'approve'}
        >
          {isPending && pendingAction === 'approve' ? 'Approving…' : ACTION_LABELS.approve}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleRewordClick}
          disabled={isPending || rewordMode}
          aria-busy={false}
        >
          {ACTION_LABELS.reverted}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => handleDirectAction('accepted')}
          disabled={isPending || rewordMode}
          aria-busy={isPending && pendingAction === 'accepted'}
        >
          {isPending && pendingAction === 'accepted' ? 'Saving…' : ACTION_LABELS.accepted}
        </button>
      </div>

      {rewordMode ? (
        <RewordEditor
          runResultId={drift.run_result_id}
          goldenQaId={drift.golden_qa_id}
          initialQuestion={drift.question}
          initialExpectedAnswer={drift.expected_answer}
          onSaved={handleRewordSaved}
          onCancel={handleRewordCancel}
        />
      ) : null}
    </article>
  );
}