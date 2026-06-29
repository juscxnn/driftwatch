'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { COPY } from '@/lib/copy';
import { seedSampleDataAction } from './sample-data';

/**
 * "Try with sample data" CTA — seeds a fake "Acme Support" project and
 * triggers a run, so a brand-new user lands on a populated inbox.
 *
 * Pairs with the primary "Create your first project" CTA in the dashboard
 * empty state.
 */
export function SeedSampleDataButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await seedSampleDataAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? COPY.inbox.seeding : COPY.inbox.trySample}
      </button>
      {error ? <p className="error-text">{COPY.inbox.seedFailedBody}</p> : null}
    </div>
  );
}
