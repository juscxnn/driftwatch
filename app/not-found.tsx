import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="space-y-6 text-center">
      <p className="text-6xl text-text-subtle font-medium tracking-tight">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">
          We could not find that page.
        </h1>
        <p className="muted">The link may be old, or the page may have moved.</p>
      </div>
      <div>
        <Link href="/" className="btn-primary">
          Back to inbox
        </Link>
      </div>
    </div>
  );
}
