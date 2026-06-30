'use client';

import { useState, useTransition } from 'react';
import { toast } from '@/components/toast';
import { COPY } from '@/lib/copy';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Field } from '@/components/field';
import { triageRunResultAction } from './actions';

export type RewordEditorProps = {
  runResultId: string;
  goldenQaId: string;
  initialQuestion: string;
  initialExpectedAnswer: string;
  /** Called when the save succeeds — parent should remove the row and
   * dismiss the editor. */
  onSaved: () => void;
  /** Called when the user clicks Cancel — parent should collapse the editor. */
  onCancel: () => void;
};

export function RewordEditor({
  runResultId,
  goldenQaId,
  initialQuestion,
  initialExpectedAnswer,
  onSaved,
  onCancel,
}: RewordEditorProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [expectedAnswer, setExpectedAnswer] = useState(initialExpectedAnswer);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (saving) return;
    setError(null);

    const trimmedQ = question.trim();
    const trimmedA = expectedAnswer.trim();
    if (!trimmedQ) {
      setError('Question cannot be empty.');
      return;
    }
    if (!trimmedA) {
      setError('Expected answer cannot be empty.');
      return;
    }

    startSave(async () => {
      // 1. PATCH the golden Q&A with the new question / expected answer.
      try {
        const res = await fetch(`/api/golden/${goldenQaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmedQ, expected_answer: trimmedA }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save the reworded question.';
        setError(message);
        toast.error(COPY.inbox.reword.errorTitle, message);
        return;
      }

      // 2. Mark this run_result as reverted so it leaves the inbox.
      const triage = await triageRunResultAction(runResultId, 'reverted');
      if (!triage.ok) {
        setError(triage.error);
        toast.error(COPY.inbox.reword.errorTitle, triage.error);
        return;
      }

      toast.success(COPY.inbox.reword.savedTitle, COPY.inbox.reword.savedBody);
      onSaved();
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Field label={COPY.inbox.reword.questionLabel} error={null}>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          rows={2}
          disabled={saving}
        />
      </Field>
      <Field label={COPY.inbox.reword.expectedLabel} error={null}>
        <Textarea
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.currentTarget.value)}
          rows={3}
          disabled={saving}
        />
      </Field>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {COPY.inbox.reword.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
        >
          {saving ? COPY.inbox.reword.saving : COPY.inbox.reword.save}
        </Button>
      </div>
    </div>
  );
}