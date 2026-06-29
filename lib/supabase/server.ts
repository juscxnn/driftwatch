// Server-side Supabase helpers (Next.js Server Components, Route Handlers,
// Server Actions). Uses @supabase/ssr so session cookies are read from the
// incoming request and refreshed on the way out.
//
// `createServerClient()` (no args) is the canonical entry point used by both
// API routes and server components — it reads the Supabase URL/anon key from
// the environment and wires up cookie read/write on the active request.

import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type SessionInfo = {
  user: User;
  email: string | null;
};

/**
 * Returns a Supabase server client bound to the current request cookies.
 *
 * Mirrors the signature the API routes expect: zero-arg, returns a fully
 * configured SupabaseClient. Async because Next.js 15's `cookies()` returns
 * a Promise.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createSSRClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component (read-only). Safe to ignore —
          // session refreshes happen on the next request from a Route Handler.
        }
      },
    },
  });
}

/** Backwards-compatible alias used by the frontend pages. */
export const getSupabaseServer = createServerClient;


/**
 * Returns the active user and email, or null if no session.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const sb = await createServerClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return { user, email: user.email ?? null };
}
