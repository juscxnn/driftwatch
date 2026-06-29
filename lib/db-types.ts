/**
 * Shared database row types.
 *
 * We keep these aligned with `supabase/migrations/0001_init.sql`. When the
 * schema changes, update this file in lockstep. The `Row` shape is the shape
 * you get from `select *`; the `Insert` / `Update` shapes are the
 * corresponding write shapes.
 */

export type Uuid = string;
export type Timestamp = string; // ISO 8601 timestamptz string from Supabase

export type TriggerSource = "manual" | "cron" | "source_change";
export type RunStatus = "running" | "completed" | "failed";
export type ReviewStatus = "pending" | "approved" | "reverted" | "accepted";
export type OrgRole = "owner" | "member";
export type SourceKind = "url" | "notion" | "file";

export interface OrganizationRow {
  id: Uuid;
  name: string;
  created_at: Timestamp;
}

export interface OrgMemberRow {
  org_id: Uuid;
  user_id: Uuid;
  role: OrgRole;
  created_at: Timestamp;
}

export interface ProjectRow {
  id: Uuid;
  org_id: Uuid;
  name: string;
  rag_endpoint_url: string | null;
  rag_endpoint_secret: string | null;
  pass_threshold: number;
  llm_provider: string;
  llm_model: string;
  judge_provider: string;
  judge_model: string;
  created_at: Timestamp;
}

export interface GoldenQaRow {
  id: Uuid;
  project_id: Uuid;
  question: string;
  expected_answer: string;
  judge_rubric: string | null;
  tags: string[];
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SourceRow {
  id: Uuid;
  project_id: Uuid;
  kind: SourceKind;
  uri: string;
  title: string | null;
  last_hash: string | null;
  last_fetched_at: Timestamp | null;
  created_at: Timestamp;
}

export interface RunRow {
  id: Uuid;
  project_id: Uuid;
  started_at: Timestamp;
  finished_at: Timestamp | null;
  status: RunStatus;
  total: number;
  passed: number;
  failed: number;
  triggered_by: TriggerSource;
  error: string | null;
}

export interface RunResultRow {
  id: Uuid;
  run_id: Uuid;
  golden_qa_id: Uuid;
  question: string;
  expected_answer: string;
  actual_answer: string | null;
  judge_score: number | null;
  judge_reasoning: string | null;
  passed: boolean | null;
  latency_ms: number | null;
  reviewed_by: Uuid | null;
  review_status: ReviewStatus;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
}

export interface SourceChangeRow {
  id: Uuid;
  source_id: Uuid;
  detected_at: Timestamp;
  old_hash: string | null;
  new_hash: string | null;
  diff_summary: string | null;
}
