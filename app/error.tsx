'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
      <div className="space-y-1">
        <p className="muted">We hit an unexpected error.</p>
        <p className="muted">
          The team has been notified. Try again in a moment.
        </p>
      </div>
      <div>
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
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
