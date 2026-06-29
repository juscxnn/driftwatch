'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
 * The org and org_members inserts run through the service-role admin
 * client because the user-scoped client cannot insert under our RLS
 * policies (they are SELECT-only during this bootstrap path). The
 * admin client is server-only and never exposed to the browser.
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

  const sb = await getSupabaseServer();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }
  const userId = data.user?.id;
  if (!userId) {
    return { ok: false, error: 'Account created but no user was returned. Try signing in.' };
  }

  // Bootstrap organization + membership with the admin client to bypass RLS.
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

function friendlyAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Wrong email or password. Please try again.';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with that email already exists. Try signing in.';
  }
  if (lower.includes('password') && lower.includes('at least')) {
    return raw;
  }
  return 'Something went wrong. Please try again.';
}