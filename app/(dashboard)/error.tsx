'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-medium tracking-tight">Something broke.</h1>
      <p className="muted">
        We could not load your dashboard. Try again, or head back to the inbox.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back to inbox
        </Link>
      </div>
      <details className="mx-auto max-w-md text-left">
        <summary className="muted cursor-pointer">Error details</summary>
        <pre className="text-xs mt-2 whitespace-pre-wrap break-words rounded border border-border bg-surface p-3">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
