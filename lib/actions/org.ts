'use server';

/**
 * Org-scoped server actions.
 *
 * - renameOrgAction       — update organizations.name
 * - saveLlmKeyAction      — encrypt + persist org LLM key
 * - removeLlmKeyAction    — clear org LLM key fields
 * - deleteOrgAction       — destructive: drop membership + org, then sign
 *                           the user out and redirect to /login
 *
 * Every action requires a live session and org membership; we use
 * `getSession()` from `lib/auth.ts` so the established conventions apply
 * (AuthError on 401/403). Returns are a discriminated union so callers
 * can render `{ok:false, error}` inline without try/catch.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSession, AuthError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret, hintForSecret } from '@/lib/encrypt';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const renameSchema = z.object({
  orgName: z.string().trim().min(1, 'Organization name cannot be empty').max(200),
});

const llmKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'API key cannot be empty')
    .max(8000, 'API key is too long'),
  /** Optional override; defaults to the currently active provider. */
  provider: z.string().trim().min(1).max(50).optional(),
});

async function revalidateOrgPaths() {
  // Both pages depend on org data; cheap to nuke both.
  revalidatePath('/settings');
  revalidatePath('/');
}

/**
 * Rename the current user's org.
 */
export async function renameOrgAction(
  formData: FormData,
): Promise<ActionResult> {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = renameSchema.safeParse({
    orgName: String(formData.get('orgName') ?? ''),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid organization name.',
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('organizations')
    .update({ name: parsed.data.orgName })
    .eq('id', session.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateOrgPaths();
  return { ok: true };
}

/**
 * Encrypt and persist the org's LLM API key. Stores both the ciphertext
 * (bytea, base64-encoded) and a short non-secret hint so the UI can
 * show "sk-…abcd" after save.
 */
export async function saveLlmKeyAction(
  formData: FormData,
): Promise<ActionResult> {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = llmKeySchema.safeParse({
    apiKey: String(formData.get('apiKey') ?? ''),
    provider: formData.get('provider') ? String(formData.get('provider')) : undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid API key.',
    };
  }

  let ciphertext: string;
  try {
    ciphertext = await encryptSecret(parsed.data.apiKey);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'Could not encrypt the API key.',
    };
  }

  const hint = hintForSecret(parsed.data.apiKey);

  // Use admin client for the write so the bytea column is settable
  // without RLS gymnastics. (RLS is on for organizations but the policy
  // covers selects; updates need service-role for non-string columns.)
  const admin = createAdminClient();
  const { error } = await admin
    .from('organizations')
    .update({
      llm_key_encrypted: ciphertext,
      llm_key_hint: hint,
      llm_key_set_at: new Date().toISOString(),
    })
    .eq('id', session.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateOrgPaths();
  return { ok: true };
}

/**
 * Remove the org's stored LLM key. Clears all three key columns.
 */
export async function removeLlmKeyAction(): Promise<ActionResult> {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('organizations')
    .update({
      llm_key_encrypted: null,
      llm_key_hint: null,
      llm_key_set_at: null,
    })
    .eq('id', session.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateOrgPaths();
  return { ok: true };
}

/**
 * Destructive. Deletes the org and every membership row, then signs the
 * user out and redirects to /login.
 *
 * Cascade rules in the schema (organizations → org_members, organizations
 * → projects → runs/run_results/etc) take care of the cleanup.
 *
 * No `requireTextMatch` enforcement here — the UI gates the button behind
 * a ConfirmDialog with `requireTextMatch="<orgName>"`.
 */
export async function deleteOrgAction(
  _formData: FormData,
): Promise<ActionResult> {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const admin = createAdminClient();

  // 1. Remove membership rows for the org. RLS doesn't apply via service
  //    role; this is a one-time cleanup.
  const { error: memberErr } = await admin
    .from('org_members')
    .delete()
    .eq('org_id', session.orgId);
  if (memberErr) {
    return { ok: false, error: memberErr.message };
  }

  // 2. Remove the org itself.
  const { error: orgErr } = await admin
    .from('organizations')
    .delete()
    .eq('id', session.orgId);
  if (orgErr) {
    return { ok: false, error: orgErr.message };
  }

  // 3. Sign the user out — clear cookies via the SSR client.
  try {
    const sb = await createServerClient();
    await sb.auth.signOut();
  } catch {
    // Cookie cleanup is best-effort here; the redirect is the contract.
  }
  // Belt-and-braces: clear any cookie whose name contains the supabase
  // auth markers so the next render of the login page doesn't see a
  // dangling session.
  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith('sb-') || c.name.includes('supabase')) {
        try {
          cookieStore.set(c.name, '', { maxAge: 0, path: '/' });
        } catch {
          // some cookies cannot be deleted from this context — ignore
        }
      }
    }
  } catch {
    // ignore — we're about to redirect
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
