/**
 * Friendly auth-error mapping. Pure helper, no Supabase / cookies / IO.
 * Exported as a standalone module (not from a `'use server'` file) so it
 * can be tested without dragging in Next.js server-action runtime.
 */

export function friendlyAuthError(raw: string): string {
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