'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '../actions';
import { COPY } from '@/lib/copy';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(COPY.auth.errors.missingFields);
      return;
    }

    const fd = new FormData();
    fd.set('email', email);
    fd.set('password', password);

    startTransition(async () => {
      const result = await loginAction(fd);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="email" className="label">
          {COPY.auth.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {COPY.auth.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : COPY.auth.submitLogin}
      </button>
      <p className="text-center text-sm text-text-muted md:hidden">
        {COPY.auth.switchToSignup.split('?')[0]}?{' '}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-hover hover:underline">
          {COPY.auth.switchToSignupCta}
        </Link>
      </p>
    </form>
  );
}
