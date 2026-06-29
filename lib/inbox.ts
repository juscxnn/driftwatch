/**
 * Server-side loader for the dashboard /api/inbox and /(dashboard)/page inbox.
 *
 * Returns the org's pending-but-non-passing run results, denormalized with
 * project name + run start time so the inbox row can render without further
 * joins. Also reports total pending count and the last run's start/status.
 *
 * Returns an empty response (not an error) when the org has no projects —
 * a fresh org shouldn't see a failure on the home page.
 */

import { createServerClient } from './supabase/server';
import type {
  InboxDrift,
  InboxResponse,
  ReviewStatus,
  RunStatus,
} from './types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const PASS_THRESHOLD = 0.7;

type JoinedRow = {
  id: string;
  run_id: string;
  question: string;
  expected_answer: string;
  actual_answer: string | null;
  judge_score: number | null;
  judge_reasoning: string | null;
  latency_ms: number | null;
  review_status: ReviewStatus;
  created_at: string;
  runs: { project_id: string; started_at: string };
};

type LastRunRow = {
  started_at: string;
  status: RunStatus;
  finished_at: string | null;
} | null;

export async function loadInbox(
  orgId: string,
  opts?: { limit?: number },
): Promise<InboxResponse> {
  const limit = clampLimit(opts?.limit ?? DEFAULT_LIMIT);
  const sb = await createServerClient();

  const { data: projectsData } = await sb
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId);

  const projects = projectsData ?? [];
  if (projects.length === 0) {
    return emptyInbox();
  }

  const allowedProjectIds = projects.map((p) => p.id);
  const projectCount = projects.length;
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const { data: driftRows, error: driftsErr } = await sb
    .from('run_results')
    .select(
      'id, run_id, question, expected_answer, actual_answer, judge_score, judge_reasoning, latency_ms, review_status, created_at, runs!inner(project_id, started_at)',
    )
    .eq('review_status', 'pending')
    .in('runs.project_id', allowedProjectIds)
    .or('passed.is.null,passed.eq.false')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (driftsErr) throw new Error(`loadInbox drifts: ${driftsErr.message}`);

  const drifts = ((driftRows ?? []) as unknown as JoinedRow[]).map(
    (row): InboxDrift => ({
      run_result_id: row.id,
      run_id: row.run_id,
      run_started_at: row.runs.started_at,
      project_id: row.runs.project_id,
      project_name: projectNameById.get(row.runs.project_id) ?? 'Unknown project',
      question: row.question,
      expected_answer: row.expected_answer,
      actual_answer: row.actual_answer,
      judge_score: row.judge_score,
      judge_reasoning: row.judge_reasoning,
      latency_ms: row.latency_ms,
      review_status: row.review_status,
      created_at: row.created_at,
    }),
  );

  const { count: totalPending, error: countErr } = await sb
    .from('run_results')
    .select('id, runs!inner(project_id)', { count: 'exact', head: true })
    .eq('review_status', 'pending')
    .in('runs.project_id', allowedProjectIds)
    .or('passed.is.null,passed.eq.false');
  if (countErr) throw new Error(`loadInbox count: ${countErr.message}`);

  const { data: lastRunData, error: lastRunErr } = await sb
    .from('runs')
    .select('started_at, status, finished_at')
    .in('project_id', allowedProjectIds)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastRunErr) throw new Error(`loadInbox last_run: ${lastRunErr.message}`);

  const lastRun = lastRunData as LastRunRow;

  return {
    drifts,
    total_pending: totalPending ?? 0,
    project_count: projectCount,
    last_run_at: lastRun?.started_at ?? null,
    last_run_status: lastRun?.finished_at ? lastRun.status : null,
  };
}

function emptyInbox(): InboxResponse {
  return {
    drifts: [],
    total_pending: 0,
    project_count: 0,
    last_run_at: null,
    last_run_status: null,
  };
}

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export const INBOX_THRESHOLD = PASS_THRESHOLD;
