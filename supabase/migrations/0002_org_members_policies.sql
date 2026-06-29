-- 0002_org_members_policies.sql
-- Add the missing SELECT policy on org_members.
--
-- 0001_init.sql enabled RLS on org_members but never defined a SELECT
-- policy. Without one, the SSR server client (which respects RLS via
-- the user's session JWT) silently returns zero rows for every
-- org_members query, which breaks:
--
--   - lib/auth.ts getSession()       — used by every API route (403s)
--   - app/(dashboard)/page.tsx       — the home page (always shows
--                                      OnboardingForm, even after a
--                                      successful setupOrgAction)
--   - the root layout's getNavContext() — nav never shows the org name
--
-- Mutations (INSERT/UPDATE/DELETE) are intentionally left without
-- policies — those only run via the admin client (service role bypasses
-- RLS), which is the correct path during signup bootstrap and
-- onboarding recovery.

-- A user can read any membership row that belongs to an org they belong
-- to. Postgres evaluates the subquery per-row against the same policy,
-- so it terminates at the user's own membership and then expands to
-- every other row in that org.
create policy "org_members_read_org_mates" on org_members
  for select using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
  );