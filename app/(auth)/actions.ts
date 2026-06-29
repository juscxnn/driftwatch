'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { friendlyAuthError } from '@/lib/auth-errors';

/**
 * Signs the current user out. The browser Supabase client also calls
 * signOut() so local storage is cleared; this server action's job is to
 * clear the session cookies on the SSR side.
 */
export async function signOutAction(): Promise<void> {
  const sb = await getSupabaseServer();
  await sb.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Creates a new user, an organization, and an org_members row linking
 * the new user as 'owner'. Used by the signup form.
 *
 * On success: redirects to the dashboard home. On error: returns the
 * error so the form can display it.
 *
 * The user is created via `admin.createUser` rather than the regular
 * `auth.signUp` because hosted Supabase can return a user from `signUp`
 * before the auth.users row is committed/visible to the connection that
 * runs the org_members FK check, which causes the insert to fail with
 * `org_members_user_id_fkey`. The admin API commits the row before
 * returning the id.
 *
 * `email_confirm: true` skips the confirmation email so the user lands
 * straight in the dashboard. To re-enable confirmation, move the
 * org_members insert into the verifyOtp callback.
 */
export type SignupResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const orgName = String(formData.get('orgName') ?? '').trim();

  if (!email || !password || !orgName) {
    return { ok: false, error: 'Please enter email, password, and an organization name.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    return {
      ok: false,
      error: createErr ? friendlyAuthError(createErr.message) : 'Could not create the account.',
    };
  }
  const userId = created.user.id;

  // Bootstrap organization + membership with the admin client to bypass RLS.
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single();
  if (orgErr || !org) {
    return {
      ok: false,
      error: orgErr?.message ?? 'Could not create the organization. Please try again.',
    };
  }

  const { error: memberErr } = await admin
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' });
  if (memberErr) {
    return { ok: false, error: memberErr.message };
  }

  // Sign the user in via the SSR client so the session cookie is set on
  // the response. Admin createUser does not establish a session.
  const sb = await getSupabaseServer();
  const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
  if (signInErr) {
    return {
      ok: false,
      error: 'Account created but could not sign you in. Please try signing in.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Creates an organization for an authenticated user who is not yet linked
 * to one (e.g. signed up before the bootstrap fix landed, or whose
 * previous signup attempt failed mid-flight). Used by the inline
 * onboarding form on the dashboard.
 */
export type SetupOrgResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setupOrgAction(formData: FormData): Promise<SetupOrgResult> {
  const orgName = String(formData.get('orgName') ?? '').trim();
  if (!orgName) {
    return { ok: false, error: 'Please enter an organization name.' };
  }

  const sb = await getSupabaseServer();
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return { ok: false, error: 'You need to sign in to set up an organization.' };
  }

  // Use the admin client so RLS doesn't block the bootstrap inserts.
  const admin = createAdminClient();
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single();
  if (orgErr || !org) {
    return {
      ok: false,
      error: orgErr?.message ?? 'Could not create the organization. Please try again.',
    };
  }

  const { error: memberErr } = await admin
    .from('org_members')
    .insert({ org_id: org.id, user_id: userId, role: 'owner' });
  if (memberErr) {
    return { ok: false, error: memberErr.message };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, error: 'Please enter your email and password.' };
  }

  const sb = await getSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}