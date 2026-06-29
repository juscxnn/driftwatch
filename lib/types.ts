// Shared frontend types — mirror the Supabase schema in 0001_init.sql.
// We only declare the columns we actually read in the UI.

export type ISODateString = string;

export type Organization = {
  id: string;
  name: string;
  created_at: ISODateString;
};

export type OrgMember = {
  org_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: ISODateString;
};

export type Project = {
  id: string;
  org_id: string;
  name: string;
  rag_endpoint_url: string | null;
  rag_endpoint_secret: string | null;
  pass_threshold: number;
  llm_provider: string;
  llm_model: string;
  judge_provider: string;
  judge_model: string;
  created_at: ISODateString;
};

export type GoldenQA = {
  id: string;
  project_id: string;
  question: string;
  expected_answer: string;
  judge_rubric: string | null;
  tags: string[];
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
};

export type Source = {
  id: string;
  project_id: string;
  kind: 'url' | 'notion' | 'file';
  uri: string;
  title: string | null;
  last_hash: string | null;
  last_fetched_at: ISODateString | null;
  created_at: ISODateString;
};

export type RunStatus = 'running' | 'completed' | 'failed';
export type RunTrigger = 'manual' | 'cron' | 'source_change';

export type Run = {
  id: string;
  project_id: string;
  started_at: ISODateString;
  finished_at: ISODateString | null;
  status: RunStatus;
  total: number;
  passed: number;
  failed: number;
  triggered_by: RunTrigger;
  error: string | null;
};

export type ReviewStatus = 'pending' | 'approved' | 'reverted' | 'accepted';

export type RunResult = {
  id: string;
  run_id: string;
  golden_qa_id: string;
  question: string;
  expected_answer: string;
  actual_answer: string | null;
  judge_score: number | null;
  judge_reasoning: string | null;
  passed: boolean | null;
  latency_ms: number | null;
  reviewed_by: string | null;
  review_status: ReviewStatus;
  reviewed_at: ISODateString | null;
  created_at: ISODateString;
};

export type TriagePatch = {
  review_status: Exclude<ReviewStatus, 'pending'>;
};

// Used in dashboard summary cards.
export type OrgTriageSummary = {
  pending_count: number;
};
