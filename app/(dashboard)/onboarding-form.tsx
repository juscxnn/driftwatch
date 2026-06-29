'use client';

import { useState, useTransition } from 'react';
import { setupOrgAction } from '@/app/(auth)/actions';
import { COPY } from '@/lib/copy';

export function OnboardingForm() {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError('Please enter an organization name.');
      return;
    }

    const fd = new FormData();
    fd.set('orgName', orgName.trim());

    startTransition(async () => {
      try {
        const result = await setupOrgAction(fd);
        if (result && !result.ok) {
          // eslint-disable-next-line no-console
          console.error('[onboarding] setupOrgAction failed:', result.error);
          setError(result.error);
        }
        // success path: action calls redirect('/'), so we never reach here
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[onboarding] setupOrgAction threw:', err);
        setError(
          err instanceof Error
            ? `Unexpected error: ${err.message}`
            : 'Unexpected error. Check the browser console for details.',
        );
      }
    });
  }

  return (
    <div className="card mx-auto max-w-md">
      <h2 className="text-lg font-medium tracking-tight">
        {COPY.onboarding.title}
      </h2>
      <p className="muted mt-1">{COPY.onboarding.body}</p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
        <div>
          <label htmlFor="orgName" className="label">
            Organization name
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            autoComplete="organization"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder={COPY.onboarding.placeholder}
            className="input"
            autoFocus
          />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isPending}
        >
          {isPending ? COPY.onboarding.submitting : COPY.onboarding.submit}
        </button>
      </form>
    </div>
  );
}