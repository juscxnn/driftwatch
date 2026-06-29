'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Golden } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { COPY } from '@/lib/copy';

type Props = {
  projectId: string;
};

type Mode = 'add' | 'bulk';

export function GoldenEditor({ projectId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('add');

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <TabButton
          label={COPY.golden.addCta}
          active={mode === 'add'}
          onClick={() => setMode('add')}
        />
        <TabButton
          label={COPY.golden.bulkImportCta}
          active={mode === 'bulk'}
          onClick={() => setMode('bulk')}
        />
      </div>
      {mode === 'add' ? (
        <AddForm
          projectId={projectId}
          onSaved={() => {
            router.refresh();
          }}
        />
      ) : (
        <BulkImportForm
          projectId={projectId}
          onSaved={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active
          ? 'bg-brand text-bg'
          : 'bg-surface-muted text-text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}

function AddForm({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [expected, setExpected] = useState('');
  const [rubric, setRubric] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!question.trim() || !expected.trim()) {
      setError('Question and expected answer are required.');
      return;
    }
    startTransition(async () => {
      try {
        await Golden.create(projectId, {
          question: question.trim(),
          expected_answer: expected.trim(),
          judge_rubric: rubric.trim() || undefined,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });
        setQuestion('');
        setExpected('');
        setRubric('');
        setTags('');
        onSaved();
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : COPY.errors.failedToSave);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label className="label">{COPY.golden.form.questionLabel}</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={COPY.golden.form.questionPlaceholder}
          className="input min-h-[60px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.expectedLabel}</label>
        <textarea
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder={COPY.golden.form.expectedPlaceholder}
          className="input min-h-[80px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.rubricLabel}</label>
        <textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          placeholder={COPY.golden.form.rubricPlaceholder}
          className="input min-h-[60px]"
        />
      </div>
      <div>
        <label className="label">{COPY.golden.form.tagsLabel}</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={COPY.golden.form.tagsPlaceholder}
          className="input"
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? COPY.golden.form.saving : COPY.golden.form.save}
      </button>
    </form>
  );
}

function BulkImportForm({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('That does not look like valid JSON. Please check the syntax and try again.');
      return;
    }
    if (!Array.isArray(parsed)) {
      setError('The JSON must be an array of objects.');
      return;
    }
    const items: {
      question: string;
      expected_answer: string;
      judge_rubric?: string;
      tags?: string[];
    }[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i] as Record<string, unknown>;
      if (
        typeof entry?.question !== 'string' ||
        typeof entry?.expected_answer !== 'string'
      ) {
        setError(`Item ${i + 1} is missing "question" or "expected_answer" string.`);
        return;
      }
      items.push({
        question: entry.question,
        expected_answer: entry.expected_answer,
        judge_rubric: typeof entry.judge_rubric === 'string' ? entry.judge_rubric : undefined,
        tags: Array.isArray(entry.tags)
          ? (entry.tags as unknown[]).filter((t): t is string => typeof t === 'string')
          : undefined,
      });
    }

    startTransition(async () => {
      let ok = 0;
      let failed = 0;
      for (const item of items) {
        try {
          await Golden.create(projectId, item);
          ok++;
        } catch {
          failed++;
        }
      }
      setInfo(`Imported ${ok}.${failed > 0 ? ` ${failed} failed.` : ''}`);
      setText('');
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p className="muted">{COPY.golden.importHelp}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`[
  { "question": "...", "expected_answer": "..." }
]`}
        className="input min-h-[160px] font-mono text-xs"
      />
      {error ? <p className="error-text">{error}</p> : null}
      {info ? <p className="text-sm text-success">{info}</p> : null}
      <button type="submit" className="btn-primary" disabled={isPending || !text.trim()}>
        {isPending ? 'Importing…' : COPY.golden.import}
      </button>
    </form>
  );
}
