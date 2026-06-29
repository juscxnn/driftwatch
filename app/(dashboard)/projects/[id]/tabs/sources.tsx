'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { Sources } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { formatRelative, truncateHash } from '@/lib/format';
import type { Source } from '@/lib/types';

type SourcesTabProps = {
  projectId: string;
  items: Source[];
};

export function SourcesTab({ projectId, items }: SourcesTabProps) {
  return (
    <div className="space-y-4">
      <p className="muted">
        {items.length === 0
          ? 'Add a source URL and we will watch it for changes.'
          : `${items.length} ${items.length === 1 ? 'source' : 'sources'}.`}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={COPY.sources.empty.title}
          body={COPY.sources.empty.body}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <SourceRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}

      <AddSourceForm projectId={projectId} />
    </div>
  );
}

function SourceRow({ item }: { item: Source }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      try {
        await Sources.refresh(item.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToLoad);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Remove this source?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await Sources.remove(item.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToDelete);
      }
    });
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-text-muted">
              {item.kind}
            </span>
            <div className="font-medium text-text">
              {item.title ?? item.uri}
            </div>
          </div>
          <a
            href={item.uri}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm text-brand hover:text-brand-hover hover:underline"
          >
            {item.uri}
          </a>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <div>
              <dt className="inline">{COPY.sources.columns.lastFetched}: </dt>
              <dd className="inline">{formatRelative(item.last_fetched_at)}</dd>
            </div>
            <div>
              <dt className="inline">{COPY.sources.columns.lastHash}: </dt>
              <dd className="inline num">{truncateHash(item.last_hash)}</dd>
            </div>
          </dl>
          {error ? <p className="error-text mt-2">{error}</p> : null}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={isPending}
          >
            {isPending ? COPY.sources.refreshing : COPY.sources.refresh}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function AddSourceForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [uri, setUri] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!uri.trim()) {
      setError('Please paste a URL.');
      return;
    }
    if (!/^https?:\/\//i.test(uri.trim())) {
      setError('The URL must start with http:// or https://');
      return;
    }
    startTransition(async () => {
      try {
        await Sources.create(projectId, {
          kind: 'url',
          uri: uri.trim(),
          title: title.trim() || undefined,
        });
        setTitle('');
        setUri('');
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  if (!open) {
    return (
      <div className="card flex items-center justify-between">
        <p className="muted">Add a URL your RAG should watch.</p>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          {COPY.sources.addCta}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3" noValidate>
      <h2 className="text-base font-medium">{COPY.sources.addCta}</h2>
      <div>
        <label className="label">{COPY.sources.form.titleLabel}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={COPY.sources.form.titlePlaceholder}
          className="input"
        />
      </div>
      <div>
        <label className="label">{COPY.sources.form.uriLabel}</label>
        <input
          type="url"
          required
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder={COPY.sources.form.uriPlaceholder}
          className="input"
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Adding…' : COPY.sources.form.save}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={isPending}
        >
          {COPY.projects.cancel}
        </button>
      </div>
    </form>
  );
}
