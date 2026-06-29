/**
 * Service-role Supabase client.
 *
 * Use this ONLY from server-side cron jobs and background tasks. It bypasses
 * RLS, so any code that imports this file is trusted to enforce org
 * scoping on its own.
 *
 * NEVER expose this client (or the service role key) to the browser.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type AdminSupabaseClient = SupabaseClient;

/**
 * Create a Supabase client with the service_role key. Returns a long-lived
 * client suitable for reuse across cron iterations.
 */
export function createAdminClient(): AdminSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
