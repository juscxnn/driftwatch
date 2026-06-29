'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { signupAction } from '../actions';
import { COPY } from '@/lib/copy';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !orgName) {
      setError(COPY.auth.errors.signupMissing);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const fd = new FormData();
    fd.set('email', email);
    fd.set('password', password);
    fd.set('orgName', orgName);

    startTransition(async () => {
      const result = await signupAction(fd);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor="orgName" className="label">
          {COPY.auth.orgNameLabel}
        </label>
        <input
          id="orgName"
          name="orgName"
          type="text"
          autoComplete="organization"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder={COPY.auth.orgNamePlaceholder}
          className="input"
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        <p className="muted mt-1">At least 8 characters.</p>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : COPY.auth.submitSignup}
      </button>
      <p className="text-center text-sm text-textMuted md:hidden">
        {COPY.auth.switchToLogin.split('?')[0]}?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {COPY.auth.switchToLoginCta}
        </Link>
      </p>
    </form>
  );
}
