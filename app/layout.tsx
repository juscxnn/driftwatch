import './globals.css';
import type { ReactNode } from 'react';
import { Nav } from '@/components/nav';
import { getSession } from '@/lib/supabase/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// Root layout depends on the Supabase session and other per-request data,
// so it must be rendered per request rather than prerendered at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Driftwatch',
  description: 'Watches your RAG and emails you when it starts lying.',
  icons: {
    icon: [
      {
        url:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#10B981"/><circle cx="16" cy="16" r="6" fill="#0E0F11"/></svg>'
          ),
        type: 'image/svg+xml',
      },
    ],
  },
};

async function getNavContext(): Promise<{
  email: string | null;
  orgName: string | null;
  pending: number;
}> {
  const session = await getSession();
  if (!session) return { email: null, orgName: null, pending: 0 };

  const sb = await getSupabaseServer();
  // Find the user's first org. (Single-org-per-user for v1.)
  const { data: membership } = await sb
    .from('org_members')
    .select('org_id, organizations(name)')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  const orgRel = membership?.organizations as { name: string } | { name: string }[] | null;
  const orgName = Array.isArray(orgRel) ? (orgRel[0]?.name ?? null) : (orgRel?.name ?? null);
  const orgId = (membership?.org_id as string | undefined) ?? null;

  let pending = 0;
  if (orgId) {
    // Count pending run_results across the org's projects. We let RLS do
    // the scoping for us.
    const { count } = await sb
      .from('run_results')
      .select('id, runs!inner(project_id, projects!inner(org_id))', {
        count: 'exact',
        head: true,
      })
      .eq('review_status', 'pending')
      .eq('runs.projects.org_id', orgId);
    pending = count ?? 0;
  }

  return { email: session.email, orgName, pending };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { email, orgName, pending } = await getNavContext();
  return (
    <html lang="en">
      <body>
        <Nav
          initialEmail={email}
          initialOrgName={orgName}
          pendingTriageCount={pending}
        />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
