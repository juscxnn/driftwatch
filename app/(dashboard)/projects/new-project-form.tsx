'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Projects } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { ApiClientError } from '@/lib/api';

type State = { open: boolean; error: string | null; success: string | null };

export function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointSecret, setEndpointSecret] = useState('');
  const [state, setState] = useState<State>({ open: false, error: null, success: null });
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName('');
    setEndpointUrl('');
    setEndpointSecret('');
    setState({ open: false, error: null, success: null });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ open, error: null, success: null });

    if (!name.trim()) {
      setState({ open, error: 'Please give the project a name.', success: null });
      return;
    }
    if (endpointUrl && !/^https?:\/\//i.test(endpointUrl.trim())) {
      setState({
        open,
        error: 'The RAG endpoint URL must start with http:// or https://',
        success: null,
      });
      return;
    }

    startTransition(async () => {
      try {
        const project = await Projects.create({
          name: name.trim(),
          rag_endpoint_url: endpointUrl.trim() || undefined,
          rag_endpoint_secret: endpointSecret.trim() || undefined,
        });
        reset();
        setOpen(false);
        router.push(`/projects/${project.id}`);
        router.refresh();
      } catch (err) {
        const msg =
          err instanceof ApiClientError ? err.message : COPY.errors.failedToSave;
        setState({ open, error: msg, success: null });
      }
    });
  }

  if (!open) {
    return (
      <div className="card flex items-center justify-between">
        <p className="muted">Add a new RAG system to watch.</p>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          {COPY.projects.newTitle}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3" noValidate>
      <h2 className="text-base font-medium">{COPY.projects.newTitle}</h2>

      <div>
        <label htmlFor="name" className="label">
          {COPY.projects.fields.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={COPY.projects.fields.namePlaceholder}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="endpointUrl" className="label">
          {COPY.projects.fields.endpointUrl}
        </label>
        <input
          id="endpointUrl"
          name="endpointUrl"
          type="url"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder={COPY.projects.fields.endpointUrlPlaceholder}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="endpointSecret" className="label">
          {COPY.projects.fields.endpointSecret}
        </label>
        <input
          id="endpointSecret"
          name="endpointSecret"
          type="password"
          value={endpointSecret}
          onChange={(e) => setEndpointSecret(e.target.value)}
          className="input"
        />
      </div>

      {state.error ? <p className="error-text">{state.error}</p> : null}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Creating…' : COPY.projects.create}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={isPending}
        >
          {COPY.projects.cancel}
        </button>
      </div>
    </form>
  );
}
