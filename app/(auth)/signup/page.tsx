import Link from 'next/link';
import { SignupForm } from './signup-form';
import { COPY } from '@/lib/copy';

export const metadata = {
  title: COPY.auth.signupMeta,
};

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">{COPY.auth.signupTitle}</h2>
      <p className="muted">{COPY.auth.signupSubtitle}</p>
      <div className="mt-5">
        <SignupForm />
      </div>
      <p className="mt-4 text-center text-sm text-textMuted">
        {COPY.auth.switchToLogin.split('?')[0]}?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {COPY.auth.switchToLoginCta}
        </Link>
      </p>
    </div>
  );
}
