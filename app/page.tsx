import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { DashboardShell, loadDashboardContext } from '@/components/dashboard-shell';
import { InboxHome } from '@/app/(dashboard)/inbox-home';
import { OnboardingForm } from '@/app/(dashboard)/onboarding-form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Root `/` page.
 *
 * - Unauthenticated visitors: redirected to the public marketing page at
 *   `/welcome`. We redirect (rather than render <Landing /> inline) so the
 *   marketing page keeps its own layout + URL for canonical/SEO purposes.
 * - Authenticated users with an org: renders the inbox inside the
 *   dashboard shell (sidebar + mobile top bar).
 * - Authenticated users with no org_members row: shows the inline
 *   onboarding form so they can recover without a dead-end.
 */
export default async function RootPage() {
  const session = await getSession();
  if (!session) {
    redirect('/welcome');
  }

  // Session exists. `loadDashboardContext` may still return null if the
  // session check inside it races — fall back to a sidebar-less shell.
  const context = await loadDashboardContext();
  if (!context) {
    return <OnboardingForm />;
  }

  const hasOrg = context.orgName !== null;
  return (
    <DashboardShell context={context}>
      {hasOrg ? <InboxHome /> : <OnboardingForm />}
    </DashboardShell>
  );
}