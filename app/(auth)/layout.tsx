import type { ReactNode } from 'react';
import { COPY } from '@/lib/copy';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white font-semibold">
            R
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{COPY.brand}</h1>
          <p className="muted">{COPY.tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
