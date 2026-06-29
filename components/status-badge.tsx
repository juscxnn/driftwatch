import type { ReviewStatus, RunStatus } from '@/lib/types';
import { COPY } from '@/lib/copy';

type Status =
  | { kind: 'run'; value: RunStatus }
  | { kind: 'review'; value: ReviewStatus }
  | { kind: 'passed'; value: boolean | null }
  | { kind: 'pending'; value: true };

const STYLES: Record<string, string> = {
  // run statuses
  running: 'bg-warn-muted text-warn',
  completed: 'bg-success-muted text-success',
  failed: 'bg-danger-muted text-danger',
  // review
  pending: 'bg-warn-muted text-warn',
  approved: 'bg-success-muted text-success',
  reverted: 'bg-danger-muted text-danger',
  accepted: 'bg-surface-muted text-text-muted',
  // pass/fail
  pass: 'bg-success-muted text-success',
  fail: 'bg-danger-muted text-danger',
  neutral: 'bg-surface-muted text-text-muted',
};

function labelFor(s: Status): string {
  switch (s.kind) {
    case 'run':
      return COPY.status[s.value];
    case 'review':
      return COPY.status[s.value];
    case 'passed':
      if (s.value == null) return COPY.status.pending;
      return s.value ? COPY.status.passed : COPY.status.failedLabel;
    case 'pending':
      return COPY.status.pending;
  }
}

function styleFor(s: Status): string {
  switch (s.kind) {
    case 'run':
      return STYLES[s.value] ?? STYLES.neutral;
    case 'review':
      return STYLES[s.value] ?? STYLES.neutral;
    case 'passed':
      if (s.value == null) return STYLES.pending;
      return s.value ? STYLES.pass : STYLES.fail;
    case 'pending':
      return STYLES.pending;
  }
}

export function StatusBadge(props: Status) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styleFor(
        props,
      )}`}
    >
      {labelFor(props)}
    </span>
  );
}
