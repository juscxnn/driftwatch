'use client';

import { COPY } from '@/lib/copy';
import { FilterIcon } from '@/components/icons';

export type ScoreFilter = 'all' | 'low' | 'mid';

export type FilterChipsProps = {
  score: ScoreFilter;
  onScoreChange: (next: ScoreFilter) => void;
  projectId: string | null;
  onProjectChange: (next: string | null) => void;
  projects: { id: string; name: string }[];
  onClear?: () => void;
};

const SCORE_OPTIONS: { value: ScoreFilter; label: string }[] = [
  { value: 'all', label: COPY.inbox.filters.all },
  { value: 'low', label: COPY.inbox.filters.lowScore },
  { value: 'mid', label: COPY.inbox.filters.midScore },
];

export function FilterChips({
  score,
  onScoreChange,
  projectId,
  onProjectChange,
  projects,
  onClear,
}: FilterChipsProps) {
  const showProjectFilter = projects.length > 1;
  const hasActive = score !== 'all' || projectId !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span aria-hidden className="inline-flex items-center gap-1.5 text-text-subtle">
        <FilterIcon className="h-3.5 w-3.5" />
      </span>

      <div role="tablist" aria-label="Filter by drift score" className="flex flex-wrap gap-1.5">
        {SCORE_OPTIONS.map((opt) => {
          const active = score === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onScoreChange(opt.value)}
              className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs transition-colors duration-100 ${
                active
                  ? 'bg-brand text-bg'
                  : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showProjectFilter ? (
        <div className="ml-1 inline-flex items-center gap-2">
          <label htmlFor="inbox-project-filter" className="text-xs text-text-subtle">
            {COPY.inbox.filters.byProject}
          </label>
          <select
            id="inbox-project-filter"
            value={projectId ?? ''}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-border-strong"
          >
            <option value="">{COPY.inbox.filters.allProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {hasActive && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-xs text-text-subtle hover:text-text"
        >
          {COPY.inbox.filters.clearFilter}
        </button>
      ) : null}
    </div>
  );
}