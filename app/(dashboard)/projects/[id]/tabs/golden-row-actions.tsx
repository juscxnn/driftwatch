'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Golden } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';
import type { GoldenQA } from '@/lib/types';

type Props = {
  item: GoldenQA;
};

export function GoldenRowActions({ item }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(item.question);
  const [expected, setExpected] = useState(item.expected_answer);
  const [rubric, setRubric] = useState(item.judge_rubric ?? '');
  const [tags, setTags] = useState(item.tags.join(', '));
  const [active, setActive] = useState(item.active);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await Golden.update(item.id, {
          question: question.trim(),
          expected_answer: expected.trim(),
          judge_rubric: rubric.trim() || null,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          active,
        });
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this golden Q&A pair?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await Golden.remove(item.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToDelete);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
          onClick={() => setEditing(true)}
          disabled={isPending}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-sm font-medium text-danger hover:underline disabled:opacity-50"
          onClick={handleDelete}
          disabled={isPending}
        >
          Delete
        </button>
        {error ? <span className="error-text ml-2">{error}</span> : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="grid grid-cols-1 gap-3 bg-surfaceMuted/60 p-3 rounded-md"
      noValidate
    >
      <div>
        <label className="label">{COPY.golden.form.questionLabel}</label>
        <textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="input min-h-[60px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.expectedLabel}</label>
        <textarea
          required
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          className="input min-h-[80px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.rubricLabel}</label>
        <textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          className="input min-h-[60px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.tagsLabel}</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Active
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? COPY.golden.form.saving : COPY.golden.form.save}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setEditing(false)}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
