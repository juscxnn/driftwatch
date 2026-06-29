-- 0001_init.sql
-- RAG Drift Watcher — initial schema
-- Run with: supabase db push (after configuring your Supabase project)

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgvector";
create extension if not exists "pg_cron";

-- Organizations
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Org members (link to Supabase auth.users)
create table org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Projects (one per watched RAG system)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  rag_endpoint_url text,
  rag_endpoint_secret text,
  pass_threshold numeric not null default 0.7,
  llm_provider text not null default 'deepseek',
  llm_model text not null default 'deepseek-chat',
  judge_provider text not null default 'deepseek',
  judge_model text not null default 'deepseek-chat',
  created_at timestamptz not null default now()
);
create index projects_org_id_idx on projects(org_id);

-- Golden Q&A pairs
create table golden_qa (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  question text not null,
  expected_answer text not null,
  judge_rubric text,
  tags text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index golden_qa_project_id_idx on golden_qa(project_id);
create index golden_qa_active_idx on golden_qa(project_id) where active = true;

-- Sources
create table sources (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('url', 'notion', 'file')),
  uri text not null,
  title text,
  last_hash text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);
create index sources_project_id_idx on sources(project_id);

-- Source chunks with embeddings (1536 = OpenAI ada / deepseek default)
create table source_chunks (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references sources(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  token_count int,
  created_at timestamptz not null default now()
);
create index source_chunks_source_id_idx on source_chunks(source_id);

-- Runs
create table runs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total int not null default 0,
  passed int not null default 0,
  failed int not null default 0,
  triggered_by text not null default 'manual' check (triggered_by in ('manual', 'cron', 'source_change')),
  error text
);
create index runs_project_id_idx on runs(project_id);
create index runs_started_at_idx on runs(project_id, started_at desc);

-- Per-question results
create table run_results (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references runs(id) on delete cascade,
  golden_qa_id uuid not null references golden_qa(id) on delete cascade,
  question text not null,
  expected_answer text not null,
  actual_answer text,
  judge_score numeric,
  judge_reasoning text,
  passed boolean,
  latency_ms int,
  reviewed_by uuid references auth.users(id),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'reverted', 'accepted')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index run_results_run_id_idx on run_results(run_id);
create index run_results_pending_idx on run_results(review_status) where review_status = 'pending';

-- Source change log
create table source_changes (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references sources(id) on delete cascade,
  detected_at timestamptz not null default now(),
  old_hash text,
  new_hash text,
  diff_summary text
);
create index source_changes_source_id_idx on source_changes(source_id, detected_at desc);

-- Row Level Security (basic; tighten in v2)
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table projects enable row level security;
alter table golden_qa enable row level security;
alter table sources enable row level security;
alter table source_chunks enable row level security;
alter table runs enable row level security;
alter table run_results enable row level security;
alter table source_changes enable row level security;

-- Simple policy: org members can read/write their org's data
create policy "org_members_read_own_org" on organizations
  for select using (
    id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org_members_read_projects" on projects
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org_members_read_golden_qa" on golden_qa
  for all using (
    project_id in (
      select p.id from projects p
      join org_members m on m.org_id = p.org_id
      where m.user_id = auth.uid()
    )
  );

create policy "org_members_read_sources" on sources
  for all using (
    project_id in (
      select p.id from projects p
      join org_members m on m.org_id = p.org_id
      where m.user_id = auth.uid()
    )
  );

create policy "org_members_read_runs" on runs
  for all using (
    project_id in (
      select p.id from projects p
      join org_members m on m.org_id = p.org_id
      where m.user_id = auth.uid()
    )
  );

create policy "org_members_read_run_results" on run_results
  for all using (
    run_id in (
      select r.id from runs r
      join projects p on p.id = r.project_id
      join org_members m on m.org_id = p.org_id
      where m.user_id = auth.uid()
    )
  );
