import type { ReviewStatus, RunStatus } from '@/lib/types';
import { COPY } from '@/lib/copy';

type Status =
  | { kind: 'run'; value: RunStatus }
  | { kind: 'review'; value: ReviewStatus }
  | { kind: 'passed'; value: boolean | null }
  | { kind: 'pending'; value: true };

const STYLES: Record<string, string> = {
  // run statuses
  running: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
  // review
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reverted: 'bg-rose-100 text-rose-800 border-rose-200',
  accepted: 'bg-sky-100 text-sky-800 border-sky-200',
  // pass/fail
  pass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fail: 'bg-rose-100 text-rose-800 border-rose-200',
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styleFor(
        props,
      )}`}
    >
      {labelFor(props)}
    </span>
  );
}
