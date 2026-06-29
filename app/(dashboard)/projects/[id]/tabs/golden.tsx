'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { COPY } from '@/lib/copy';
import type { GoldenQA } from '@/lib/types';
import { GoldenEditor } from './golden-editor';
import { GoldenRowActions } from './golden-row-actions';

type GoldenTabProps = {
  projectId: string;
  items: GoldenQA[];
};

export function GoldenTab({ projectId, items }: GoldenTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="muted">
          {items.length === 0
            ? 'Add the first golden Q&A pair to get started.'
            : `${items.length} ${items.length === 1 ? 'pair' : 'pairs'}.`}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={COPY.golden.empty.title}
          body={COPY.golden.empty.body}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <GoldenItemRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}

      <GoldenEditor projectId={projectId} />
    </div>
  );
}

function GoldenItemRow({ item }: { item: GoldenQA }) {
  // Per-row edit state so only one row is in edit mode at a time.
  // Default collapsed: show the question and a small preview.
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="text-left flex-1 min-w-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="font-medium text-text">{item.question}</div>
          <div className="mt-1 line-clamp-2 text-sm text-textMuted">
            {item.expected_answer}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {item.tags.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surfaceMuted px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                item.active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              {item.active ? 'Active' : 'Inactive'}
            </span>
            <span className="muted">{expanded ? '▾' : '▸'}</span>
          </div>
        </button>
        <div className="shrink-0">
          <GoldenRowActions item={item} />
        </div>
      </div>
      {expanded ? (
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Detail label="Question" value={item.question} />
          <Detail label="Expected answer" value={item.expected_answer} />
          {item.judge_rubric ? (
            <Detail
              label="Judge rubric"
              value={item.judge_rubric}
              className="sm:col-span-2"
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-medium uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-text">{value}</div>
    </div>
  );
}
