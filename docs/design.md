# RAG Drift Watcher — Design Spec

> Source of truth for the build. The Coder team reads this first.

## 1. Product in one paragraph

A SaaS that watches a customer's RAG system and alerts them when it starts producing
wrong, stale, or hallucinated answers. Three core features:

1. **Golden Q&A runner** — customer defines question + expected answer pairs; we run them
   through their RAG endpoint on a schedule and compare actual vs expected.
2. **Source watcher** — customer points us at their source docs (Notion, website, PDFs); when
   the source changes, we re-run the golden Qs and flag drift.
3. **Reviewer dashboard** — non-technical user (PM, founder, support lead) sees a clean list
   of drifted answers, the old vs new outputs, the source docs that changed, and approves /
   reverts / accepts.

## 2. Stack

- **Frontend + API**: Next.js 15 (App Router) on Vercel
- **Database + Auth + Storage**: Supabase (Postgres + Auth + Storage)
- **Vector search**: Supabase pgvector (for source doc embeddings)
- **LLM provider**: DeepSeek (default, OpenAI-compatible). Adapter pattern so any
  OpenAI-compatible provider (Kimi, OpenAI, Anthropic via proxy) can swap in.
- **Email alerts**: Resend
- **Cron**: Supabase pg_cron (or Vercel Cron) for daily runs
- **Language**: TypeScript end-to-end

## 3. Data model (Supabase / Postgres)

```sql
-- Organizations (tenants)
organizations (
  id uuid pk,
  name text,
  created_at timestamptz
)

-- Users are managed by Supabase Auth; org membership is via:
org_members (
  org_id uuid fk,
  user_id uuid fk,  -- supabase auth.users.id
  role text,        -- 'owner' | 'member'
  primary key (org_id, user_id)
)

-- A RAG system being watched
projects (
  id uuid pk,
  org_id uuid fk,
  name text,
  rag_endpoint_url text,           -- customer's RAG endpoint (we POST questions)
  rag_endpoint_secret text,        -- optional bearer token
  llm_provider text default 'deepseek',
  llm_model text default 'deepseek-chat',
  judge_provider text default 'deepseek',
  judge_model text default 'deepseek-chat',
  created_at timestamptz
)

-- Golden Q&A pairs the customer defines
golden_qa (
  id uuid pk,
  project_id uuid fk,
  question text,
  expected_answer text,            -- what the correct answer should contain
  judge_rubric text,               -- optional detailed scoring criteria
  tags text[],
  active boolean default true,
  created_at timestamptz
)

-- Source docs the customer's RAG uses
sources (
  id uuid pk,
  project_id uuid fk,
  kind text,                       -- 'url' | 'notion' | 'file'
  uri text,                        -- the URL / Notion page id / file storage path
  title text,
  last_hash text,                  -- hash of last-fetched content
  last_fetched_at timestamptz,
  created_at timestamptz
)

-- Embeddings of source doc chunks (pgvector)
source_chunks (
  id uuid pk,
  source_id uuid fk,
  chunk_index int,
  content text,
  embedding vector(1536),          -- adjust dim to match provider
  token_count int
)

-- A run of the golden Q&A suite against a project
runs (
  id uuid pk,
  project_id uuid fk,
  started_at timestamptz,
  finished_at timestamptz,
  status text,                     -- 'running' | 'completed' | 'failed'
  total int, passed int, failed int,
  triggered_by text                -- 'cron' | 'manual' | 'source_change'
)

-- Per-question result within a run
run_results (
  id uuid pk,
  run_id uuid fk,
  golden_qa_id uuid fk,
  question text,
  expected_answer text,
  actual_answer text,
  judge_score numeric,             -- 0.0-1.0
  judge_reasoning text,
  passed boolean,
  latency_ms int,
  reviewed_by uuid,                -- user id who triaged
  review_status text,              -- 'pending' | 'approved' | 'reverted' | 'accepted'
  reviewed_at timestamptz
)

-- Source change log (so we can correlate drift with doc changes)
source_changes (
  id uuid pk,
  source_id uuid fk,
  detected_at timestamptz,
  old_hash text,
  new_hash text,
  diff_summary text                -- short LLM-generated summary of what changed
)
```

## 4. API surface (Next.js route handlers under `/app/api`)

All routes require auth via Supabase session, scoped to the user's org.

- `POST /api/projects` — create project
- `GET /api/projects` — list projects for org
- `GET /api/projects/:id` — get project detail
- `PATCH /api/projects/:id` — update (incl. RAG endpoint)
- `DELETE /api/projects/:id`

- `POST /api/projects/:id/golden` — add a golden Q&A
- `GET /api/projects/:id/golden` — list golden Q&As
- `PATCH /api/golden/:id` — update
- `DELETE /api/golden/:id`

- `POST /api/projects/:id/sources` — add a source
- `GET /api/projects/:id/sources` — list sources
- `DELETE /api/sources/:id`
- `POST /api/sources/:id/refresh` — force re-fetch + re-embed

- `POST /api/projects/:id/runs` — trigger a run (manual)
- `GET /api/projects/:id/runs` — list recent runs
- `GET /api/runs/:id` — get run detail with all results
- `PATCH /api/run_results/:id` — triage a result (approve / revert / accept)

- `POST /api/cron/daily-runs` — invoked by Supabase cron; runs daily check on all active projects

## 5. Core algorithm: the drift check

For each run:

```
for golden_qa in active_golden_qas:
  1. POST { question: golden_qa.question } to project.rag_endpoint_url
     with optional auth header
  2. Capture response (assume { answer: string } JSON; tolerate string fallback)
  3. Call LLM judge with rubric:
     "Score 0.0-1.0 whether the actual_answer correctly addresses the question
      given the expected_answer and rubric. Return { score, reasoning }."
  4. passed = judge_score >= 0.7 (configurable per project)
  5. Insert run_result row
```

For source changes:

```
for source in project.sources (on a schedule, default every 6h):
  1. Fetch source content (URL scrape, Notion page fetch, or storage download)
  2. Hash content; if hash == last_hash, skip
  3. If changed:
     a. Save source_change row
     b. Re-embed chunks (split into ~500-token windows, embed with project LLM)
     c. Trigger a new run with triggered_by = 'source_change'
```

## 6. LLM provider adapter

Single interface in `lib/llm/provider.ts`:

```ts
interface LLMProvider {
  chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
       opts?: { model?: string; temperature?: number; maxTokens?: number })
    : Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number } }>;

  embed(texts: string[], opts?: { model?: string })
    : Promise<{ embedding: number[] }[]>;
}
```

Implementations live in `lib/llm/providers/{deepseek,kimi,openai,anthropic}.ts`.
Default: deepseek. Selection via env var `LLM_PROVIDER` and per-project override.

## 7. Frontend pages (Next.js App Router)

- `/login`, `/signup` — Supabase Auth UI
- `/` (dashboard home) — org's projects, recent runs, alerts summary
- `/projects` — list + create
- `/projects/:id` — project detail with tabs:
  - **Overview** — last run status, drift count, source health
  - **Golden Q&A** — editor (list, add, edit, delete, bulk import as JSON)
  - **Sources** — add/remove sources, last fetch, hash diff
  - **Runs** — list of runs, click into one to see results
  - **Triage** — queue of pending reviews across all runs

## 8. Out of scope for v1

- Multi-tenant SSO/SAML
- Custom eval rubrics UI builder
- Per-question routing (different model per question)
- Auto-fix / auto-rewriting of failing golden Qs
- Self-hosted LLM support
- Webhooks / Slack integration (use email for v1)

## 9. Non-goals (firmly NOT doing)

- Building a RAG system for the customer
- Replacing LangChain / LlamaIndex
- Building a UI to design RAG pipelines
- Fine-tuning, embeddings training, or any model work

We sit *beside* the customer's RAG stack, not inside it.

## 10. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, for cron + background jobs
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=
RESEND_API_KEY=
ALERT_FROM_EMAIL=alerts@yourdomain.com
APP_URL=http://localhost:3000
CRON_SECRET=                        # shared secret for /api/cron/daily-runs
```
