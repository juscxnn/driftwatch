'use client';

import { useState } from 'react';
import { DataTable } from '@/components/data-table';
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
        <GoldenList items={items} />
      )}

      <GoldenEditor projectId={projectId} />
    </div>
  );
}

function GoldenList({ items }: { items: GoldenQA[] }) {
  const [search, setSearch] = useState('');
  return (
    <DataTable<GoldenQA>
      rows={items}
      rowKey={(item) => item.id}
      defaultSort={{ key: 'question', direction: 'asc' }}
      search={{
        placeholder: 'Search questions or tags…',
        value: search,
        onChange: setSearch,
        match: (item, q) => {
          const needle = q.toLowerCase();
          return (
            item.question.toLowerCase().includes(needle) ||
            item.tags.some((t) => t.toLowerCase().includes(needle))
          );
        },
      }}
      columns={[
        {
          key: 'question',
          header: 'Question',
          sortBy: (item) => item.question.toLowerCase(),
          cell: (item) => <GoldenRow item={item} />,
        },
        {
          key: 'active',
          header: 'Active',
          className: 'w-24',
          sortBy: (item) => (item.active ? 1 : 0),
          cell: (item) => (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                item.active
                  ? 'bg-success-muted text-success'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {item.active ? 'Active' : 'Inactive'}
            </span>
          ),
        },
        {
          key: 'actions',
          header: '',
          className: 'w-32 text-right',
          cell: (item) => <GoldenRowActions item={item} />,
        },
      ]}
    />
  );
}

function GoldenRow({ item }: { item: GoldenQA }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="text-left w-full"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="font-medium text-text">{item.question}</div>
        <div className="mt-1 line-clamp-2 text-sm text-text-muted">
          {item.expected_answer}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {item.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-muted px-2 py-0.5 text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
          <span className="muted">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded ? (
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Detail label={COPY.golden.columns.question} value={item.question} />
          <Detail label={COPY.golden.columns.expected} value={item.expected_answer} />
          {item.judge_rubric ? (
            <Detail
              label="Judge rubric"
              value={item.judge_rubric}
              className="sm:col-span-2"
            />
          ) : null}
        </div>
      ) : null}
    </div>
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
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-text">{value}</div>
    </div>
  );
}
