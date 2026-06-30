'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/field';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { GoldenIllustration } from '@/components/empty-state-illustrations';
import { toast } from '@/components/toast';
import {
  ArrowRightIcon,
  PlusIcon,
  CheckIcon,
} from '@/components/icons';
import { Projects, Golden } from '@/lib/api';

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-4 w-4 ${props.className ?? ''}`}
      {...props}
    >
      <path d="M13 8H3" />
      <path d="M7 4L3 8l4 4" />
    </svg>
  );
}

type Step = 1 | 2 | 3;

type StarterQA = {
  question: string;
  expected_answer: string;
};

const STARTER_QAS: StarterQA[] = [
  {
    question: 'What does your product do?',
    expected_answer:
      'A 1-2 sentence summary of the main value proposition, taken from the docs.',
  },
  {
    question: 'How do I get started?',
    expected_answer:
      'The shortest install/setup path, including any required accounts or env vars.',
  },
  {
    question: 'Where can I find pricing details?',
    expected_answer:
      'A pointer to the pricing page or the plan tiers with key limits.',
  },
];

const MODEL_OPTIONS = ['deepseek-chat', 'gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'];

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function NewProjectWizard({ hasLlmKey }: { hasLlmKey: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // === Step 1 fields ===
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointSecret, setEndpointSecret] = useState('');
  const [step1Errors, setStep1Errors] = useState<{
    name?: string;
    url?: string;
  }>({});

  // === Step 2 fields ===
  const [threshold, setThreshold] = useState(0.7);
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // === Step 3 fields ===
  const [qas, setQas] = useState<StarterQA[]>([]);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  function validateStep1(): boolean {
    const next: typeof step1Errors = {};
    if (name.trim().length === 0) {
      next.name = 'Please give the project a name.';
    }
    if (endpointUrl.trim().length > 0 && !isValidUrl(endpointUrl)) {
      next.url = 'The RAG endpoint must start with http:// or https://';
    }
    setStep1Errors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    if (model.trim().length === 0) {
      setStep2Error('Please pick a judge model.');
      return false;
    }
    setStep2Error(null);
    return true;
  }

  function validateStep3(): boolean {
    for (const qa of qas) {
      if (qa.question.trim().length === 0 || qa.expected_answer.trim().length === 0) {
        setStep3Error(
          'Please fill in both the question and the expected answer for every row, or remove empty rows.',
        );
        return false;
      }
    }
    setStep3Error(null);
    return true;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function handleAddStarters() {
    const missing = 3 - qas.length;
    if (missing <= 0) {
      // Already at 3; just normalize.
      setQas((prev) => prev.slice(0, 3));
      return;
    }
    const fillers = STARTER_QAS.slice(0, missing);
    setQas((prev) => [...prev, ...fillers]);
  }

  function handleRemoveQA(idx: number) {
    setQas((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleQAChange(
    idx: number,
    field: keyof StarterQA,
    value: string,
  ) {
    setQas((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  }

  async function handleSubmit() {
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      // Roll back to the first invalid step.
      if (!validateStep1()) setStep(1);
      else if (!validateStep2()) setStep(2);
      return;
    }
    setSubmitError(null);
    const payload = {
      name: name.trim(),
      rag_endpoint_url: endpointUrl.trim() ? endpointUrl.trim() : undefined,
      rag_endpoint_secret: endpointSecret.trim()
        ? endpointSecret.trim()
        : undefined,
      pass_threshold: threshold,
      llm_model: model,
      judge_model: model,
    };
    startTransition(async () => {
      try {
        const project = await Projects.create(payload);
        // Sequentially create golden Q&As. Tolerate per-row failures so
        // a single bad row doesn't kill the whole onboarding.
        for (const qa of qas) {
          try {
            await Golden.create(project.id, {
              question: qa.question.trim(),
              expected_answer: qa.expected_answer.trim(),
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[wizard] failed to insert starter QA:', err);
          }
        }
        toast.success(`Project "${project.name}" created`);
        router.push(`/projects/${project.id}?welcome=1`);
        router.refresh();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Could not create the project.';
        setSubmitError(msg);
      }
    });
  }

  const stepLabels = useMemo(
    () => ['Endpoint', 'Judge', 'Starter Q&As'] as const,
    [],
  );

  return (
    <div className="card space-y-6">
      <ProgressBar step={step} labels={stepLabels} />

      {/* ============ Step 1 ============ */}
      {step === 1 ? (
        <div className="space-y-4">
          <header>
            <h2 className="text-base font-medium tracking-tight">
              Name your project &amp; point at a RAG endpoint
            </h2>
            <p className="muted mt-1">
              We&apos;ll send{' '}
              <span className="num">
                {`{ "question": "…" }`}
              </span>{' '}
              to that URL and read{' '}
              <span className="num">{`{ "answer": "…" }`}</span> back.
            </p>
          </header>

          <Field label="Project name" error={step1Errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer support bot"
              autoComplete="off"
              maxLength={200}
              aria-invalid={Boolean(step1Errors.name)}
              autoFocus
            />
          </Field>

          <Field
            label="RAG endpoint URL"
            helper="http://localhost:3001 works for local dev. We expect it to accept POST JSON."
            error={step1Errors.url}
          >
            <Input
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://example.com/api/rag"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(step1Errors.url)}
            />
          </Field>

          <Field
            label="Bearer token (optional)"
            helper="Sent as Authorization: Bearer &lt;token&gt;. Leave blank to skip."
          >
            <Input
              value={endpointSecret}
              onChange={(e) => setEndpointSecret(e.target.value)}
              type="password"
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        </div>
      ) : null}

      {/* ============ Step 2 ============ */}
      {step === 2 ? (
        <div className="space-y-4">
          <header>
            <h2 className="text-base font-medium tracking-tight">
              Pick a judge model &amp; pass threshold
            </h2>
            <p className="muted mt-1">
              We call this model after every golden Q&amp;A to score the
              answer against your expected response. A score at or above the
              threshold counts as a pass.
            </p>
          </header>

          <Field
            label="Pass threshold"
            helper={`A score of ${threshold.toFixed(2)} or higher is a pass.`}
            error={step2Error}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                aria-label="Pass threshold"
                className="h-2 flex-1 appearance-none rounded-full bg-surface-muted accent-brand"
              />
              <span className="num w-10 text-right text-xs text-text">
                {threshold.toFixed(2)}
              </span>
            </div>
          </Field>

          <Field label="Judge model">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          {!hasLlmKey ? (
            <p className="subtle rounded-md border border-border bg-surface-muted px-3 py-2">
              You haven&apos;t saved an API key in Settings yet. We&apos;ll
              fall back to the deployment&apos;s env-configured key for this
              project. Add one in <Link href="/settings" className="text-brand hover:underline">Settings → LLM key</Link> to use your
              own.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ============ Step 3 ============ */}
      {step === 3 ? (
        <div className="space-y-4">
          <header>
            <h2 className="text-base font-medium tracking-tight">
              Add a starter set of Q&amp;As
            </h2>
            <p className="muted mt-1">
              You can skip this and add questions after the project is
              created. We recommend at least three to make the first run
              meaningful.
            </p>
          </header>

          {qas.length === 0 ? (
            <EmptyState
              illustration={<GoldenIllustration className="h-16 w-16 text-text-subtle" />}
              title="No starter questions yet"
              body="Click below to seed three example Q&As you can edit. They're just a starting point."
              action={
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddStarters}
                  icon={<PlusIcon aria-hidden />}
                >
                  Add 3 starter questions
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {qas.map((qa, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-surface p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-medium uppercase tracking-wide text-text-muted">
                      Question {i + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQA(i)}
                    >
                      Remove
                    </Button>
                  </div>
                  <Textarea
                    value={qa.question}
                    onChange={(e) =>
                      handleQAChange(i, 'question', e.target.value)
                    }
                    placeholder="The question your RAG should answer correctly."
                    rows={2}
                  />
                  <div className="space-y-1">
                    <label className="label">Expected answer</label>
                    <Textarea
                      value={qa.expected_answer}
                      onChange={(e) =>
                        handleQAChange(i, 'expected_answer', e.target.value)
                      }
                      placeholder="The answer your RAG should produce."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              {qas.length < 3 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddStarters}
                  icon={<PlusIcon aria-hidden />}
                >
                  Add {3 - qas.length} more
                </Button>
              ) : null}
            </div>
          )}

          {step3Error ? <p className="error-text">{step3Error}</p> : null}
        </div>
      ) : null}

      {submitError ? <p className="error-text">{submitError}</p> : null}

      {/* ============ Footer nav ============ */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <div>
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              icon={<ArrowLeftIcon aria-hidden />}
              disabled={pending}
            >
              Back
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/projects">Cancel</Link>
            </Button>
          )}
        </div>
        <div>
          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={pending}
            >
              Continue
              <ArrowRightIcon aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              loading={pending}
              success={false}
              icon={<CheckIcon aria-hidden />}
            >
              Create project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Three-dot progress bar with labels. */
function ProgressBar({
  step,
  labels,
}: {
  step: Step;
  labels: readonly string[];
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding steps">
      {labels.map((label, i) => {
        const idx = (i + 1) as Step;
        const state =
          idx < step ? 'done' : idx === step ? 'current' : 'upcoming';
        const dot =
          state === 'done'
            ? 'bg-brand text-bg'
            : state === 'current'
              ? 'border-brand text-brand'
              : 'border-border text-text-subtle';
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-2"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span
              aria-hidden
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-2xs font-medium ${dot}`}
            >
              {state === 'done' ? <CheckIcon /> : i + 1}
            </span>
            <span className="text-2xs font-medium uppercase tracking-wide text-text-muted">
              {label}
            </span>
            {i < labels.length - 1 ? (
              <span
                aria-hidden
                className={`h-px flex-1 ${state === 'done' ? 'bg-brand' : 'bg-border'}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
