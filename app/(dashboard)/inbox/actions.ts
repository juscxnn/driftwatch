'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export type TriageActionResult =
  | { ok: true }
  | { ok: false; error: string };

const ALLOWED_STATUSES = ['approved', 'reverted', 'accepted'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(s: unknown): s is AllowedStatus {
  return typeof s === 'string' && (ALLOWED_STATUSES as readonly string[]).includes(s);
}

/**
 * Mark a single run_result as triaged. Used by the inbox DriftRow
 * buttons (Approve / Reword Q / Escalate).
 *
 * Scope: org-scoped via session.orgId — joins through run → project to
 * confirm the result belongs to this org before writing.
 */
export async function triageRunResultAction(
  runResultId: string,
  reviewStatus: string,
): Promise<TriageActionResult> {
  if (!runResultId || typeof runResultId !== 'string') {
    return { ok: false, error: 'Missing run result id.' };
  }
  if (!isAllowedStatus(reviewStatus)) {
    return { ok: false, error: 'Invalid review status.' };
  }

  const session = await getSession();
  const sb = await createServerClient();

  const allowedProjectIds =
    (await sb.from('projects').select('id').eq('org_id', session.orgId))
      .data?.map((p: { id: string }) => p.id) ?? [];
  if (allowedProjectIds.length === 0) {
    return { ok: false, error: 'Run result not found.' };
  }

  const { data: result, error: findErr } = await sb
    .from('run_results')
    .select('id, run_id')
    .eq('id', runResultId)
    .maybeSingle();
  if (findErr) return { ok: false, error: findErr.message };
  if (!result) return { ok: false, error: 'Run result not found.' };

  const { data: run, error: runErr } = await sb
    .from('runs')
    .select('id, project_id')
    .eq('id', result.run_id)
    .in('project_id', allowedProjectIds)
    .maybeSingle();
  if (runErr) return { ok: false, error: runErr.message };
  if (!run) return { ok: false, error: 'Run result not found.' };

  const { error } = await sb
    .from('run_results')
    .update({
      review_status: reviewStatus,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', runResultId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}