import Link from 'next/link';
import { LoginForm } from './login-form';
import { COPY } from '@/lib/copy';

export const metadata = {
  title: COPY.auth.signInMeta,
};

// Auth pages still set cookies via Supabase actions; keep them dynamic so
// build-time prerender does not try to evaluate the form.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="card">
      <h2 className="text-lg font-medium">{COPY.auth.loginTitle}</h2>
      <p className="muted">{COPY.auth.loginSubtitle}</p>
      <div className="mt-5">
        <LoginForm />
      </div>
      <p className="mt-4 text-center text-sm text-text-muted">
        {COPY.auth.switchToSignup.split('?')[0]}?{' '}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-hover hover:underline">
          {COPY.auth.switchToSignupCta}
        </Link>
      </p>
    </div>
  );
}
