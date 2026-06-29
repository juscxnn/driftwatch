-- 0003_fix_org_members_recursion.sql
-- Fix infinite recursion in the org_members SELECT policy.
--
-- 0002_org_members_policies.sql created a policy whose USING clause
-- references org_members inside a subquery:
--
--   create policy org_members_read_org_mates on org_members
--     for select using (org_id in (
--       select org_id from org_members where user_id = auth.uid()
--     ));
--
-- Every query against org_members under RLS evaluates the USING clause,
-- which itself queries org_members under RLS, which evaluates the USING
-- clause again — infinite loop. Postgres detects this at query time and
-- raises:
--
--   ERROR: infinite recursion detected in policy for relation "org_members"
--
-- This breaks every code path that needs the current user's org: the
-- dashboard home page, the root layout's nav, lib/auth.ts getSession()
-- (which 403s every API route), and every server action that calls
-- getSession(). The signup/onboarding actions ALSO fail because
-- lib/auth.ts getSession() is the source of session.orgId.
--
-- Fix: replace the recursive USING clause with the simple
-- "rows where user_id = auth.uid()" condition. Every existing RLS-bound
-- read site already filters by user_id, so the simpler policy is
-- functionally equivalent for current usage. Reads that need other
-- members of an org go through the admin client (service role bypasses
-- RLS), so they are unaffected.

drop policy if exists "org_members_read_org_mates" on org_members;

create policy "org_members_read_own" on org_members
  for select using (user_id = auth.uid());