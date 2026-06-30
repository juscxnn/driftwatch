import { redirect } from 'next/navigation';
import { getSession as getAuthSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth';
import { DashboardShell, loadDashboardContext } from '@/components/dashboard-shell';
import { SettingsClient } from './settings-client';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function SettingsPage() {
  let authSession;
  try {
    authSession = await getAuthSession();
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

  // Load the org row. RLS scopes this to orgs the user is a member of,
  // so it Just Works without us filtering by id again.
  const { data: orgRow, error: orgErr } = await sb
    .from('organizations')
    .select('id, name, llm_key_hint, llm_key_set_at')
    .eq('id', authSession.orgId)
    .maybeSingle();
  if (orgErr || !orgRow) {
    return null;
  }

  // Members read-only. The user-facing RLS policy lets a user read their
  // own membership rows, but for the settings page we want the full
  // roster. Service role bypasses RLS and lets us enumerate.
  const admin = createAdminClient();
  const { data: membersRows } = await admin
    .from('org_members')
    .select('user_id, role, created_at')
    .eq('org_id', orgRow.id)
    .order('created_at', { ascending: true });

  let emailByUserId: Record<string, string> = {};
  if (membersRows && membersRows.length > 0) {
    const { data: usersData } = await admin.auth.admin.listUsers();
    for (const u of usersData?.users ?? []) {
      if (u.id && u.email) emailByUserId[u.id] = u.email;
    }
  }

  const members = (membersRows ?? []).map((m) => ({
    user_id: m.user_id,
    role: (m.role as 'owner' | 'member') ?? 'member',
    created_at: m.created_at,
    email: emailByUserId[m.user_id] ?? null,
  }));

  return (
    <DashboardShell context={context}>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
          <p className="muted mt-1">
            Manage your organization, members, and LLM provider key.
          </p>
        </header>
        <SettingsClient
          orgId={orgRow.id}
          orgName={orgRow.name ?? ''}
          hasStoredKey={Boolean(orgRow.llm_key_set_at)}
          llmKeyHint={orgRow.llm_key_hint ?? null}
          llmKeySetAt={orgRow.llm_key_set_at ?? null}
          members={members}
          currentUserId={authSession.userId}
          currentUserRole={authSession.role}
        />
      </div>
    </DashboardShell>
  );
}
