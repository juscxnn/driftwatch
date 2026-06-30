import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession as getAuthSession, AuthError } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { DashboardShell, loadDashboardContext } from '@/components/dashboard-shell';
import { NewProjectWizard } from './wizard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function NewProjectPage() {
  let session;
  try {
    session = await getAuthSession();
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(err.statusCode === 403 ? '/' : '/login');
    }
    throw err;
  }

  const context = await loadDashboardContext();
  if (!context) {
    return null;
  }

  const sb = await getSupabaseServer();
  const { data: orgRow } = await sb
    .from('organizations')
    .select('id, llm_key_set_at')
    .eq('id', session.orgId)
    .maybeSingle();
  const hasLlmKey = Boolean(orgRow?.llm_key_set_at);

  return (
    <DashboardShell context={context}>
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <div className="muted">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>{' '}
            / New project
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Watch a new RAG</h1>
          <p className="muted">
            Three quick steps. You can change everything later in Settings.
          </p>
        </header>
        <NewProjectWizard hasLlmKey={hasLlmKey} />
      </div>
    </DashboardShell>
  );
}
