// Browser-side Supabase client. Uses the anon key + cookie storage so
// session is shared with the server (via @supabase/ssr cookies handler).
//
// Usage: `import { getSupabaseBrowser } from '@/lib/supabase/client'`
// then call it once per request to get a fresh client instance.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for the browser.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the
 * environment. The anon key is safe to expose — Supabase enforces RLS on
 * every query.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
