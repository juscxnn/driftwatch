# RAG Drift Watcher

> Watches your RAG system and screams when it starts lying.

A SaaS that detects when a customer's RAG (Retrieval-Augmented Generation) system
starts producing wrong, stale, or hallucinated answers. Three core features:

1. **Golden Q&A runner** — define question + expected answer pairs; we run them
   through your RAG endpoint on a schedule and compare actual vs expected.
2. **Source watcher** — point us at your source docs; when they change, we
   re-run the golden Qs and flag drift.
3. **Reviewer dashboard** — non-technical user (PM, founder, support lead) sees
   a clean list of drifted answers and triages them.

## Stack

- **Frontend + API**: Next.js 15 on Vercel
- **DB / Auth / Storage**: Supabase (Postgres + Auth + Storage + pgvector)
- **LLM judge**: DeepSeek (default, OpenAI-compatible) — pluggable adapter
- **Email**: Resend
- **Cron**: Supabase pg_cron

## Quick start (local dev)

```bash
# 1. Clone & install
git clone <this-repo> && cd rag-drift-watcher
npm install

# 2. Set up Supabase locally (or use a hosted project)
npx supabase init
npx supabase start

# 3. Apply BOTH migrations (0001 is the schema, 0002 adds missing RLS)
npx supabase db push

# 4. Configure env
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, RESEND_API_KEY

# 5. Run
npm run dev
```

App will be on http://localhost:3000.

## Required env vars

| Var | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (public, sent to the browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (public, RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase service-role key — **server-only**, bypasses RLS. Used by cron and admin actions. Never expose with `NEXT_PUBLIC_`. |
| `LLM_PROVIDER` | no | Default `deepseek`. Adapter factory in `lib/llm/`. |
| `DEEPSEEK_API_KEY` | yes (default provider) | DeepSeek API key for the LLM judge |
| `RESEND_API_KEY` | yes (alerts on) | Resend API key for drift alert emails |
| `ALERT_FROM_EMAIL` | yes (alerts on) | Sender address — must be a **verified sender** in Resend, e.g. `alerts@yourdomain.com` |
| `APP_URL` | yes (prod) | Absolute URL of the app, e.g. `https://driftwatch.example.com`. Used to build absolute URLs server-side and to scope server actions. |
| `CRON_SECRET` | yes (prod) | Random 32+ char string. Bearer token for `/api/cron/daily-runs`. |

## Deploy to production

1. Push the repo to GitHub.
2. In Vercel: "Import Project" → select the repo → set env vars → deploy.
3. In Supabase: create a project → run the SQL in
   `supabase/migrations/0001_init.sql` followed by
   `supabase/migrations/0002_org_members_policies.sql`.
4. Configure your custom cron (Vercel Cron or Supabase pg_cron) to POST to
   `https://your-app.vercel.app/api/cron/daily-runs` with header
   `Authorization: Bearer $CRON_SECRET` once per day.

## Health & operations

- `GET /api/health` — returns service health JSON (env presence checks, no
  live third-party pings). Responds `200` when healthy, `503` when Supabase
  is not configured. Point BetterStack / Vercel monitoring at this URL.
- `POST/GET /api/cron/daily-runs` — cron endpoint, requires
  `Authorization: Bearer $CRON_SECRET`. Iterates all projects and triggers
  a run for any project that hasn't run in the last 12h.

## Architecture

See [docs/design.md](docs/design.md) for the full design spec.

## Project layout

```
app/                       Next.js app router pages + API routes
  api/
    health/                health endpoint (GET /api/health)
    cron/daily-runs/       cron endpoint (POST/GET)
    golden/                golden Q&A CRUD
    runs/                  run history
    run-results/           per-result detail
    sources/               source doc watcher
    projects/              project CRUD
    inbox/                 reviewer inbox API
    sample-rag/            demo RAG endpoint for first-time users
  (auth)/                  login, signup, callback
  (dashboard)/             logged-in pages
    inbox/                 inbox + drift row + triage actions
    projects/              project list + per-project views
    runs/                  run history views
    triage/                triage flow
components/                shared React components
lib/                       server-side helpers
  llm/                     LLM provider adapters
  rag/                     RAG client + drift detection engine
  supabase/                Supabase client factories
supabase/migrations/       SQL migrations
docs/                      design docs
scripts/                   one-off scripts
```

## License

MIT (or your choice — TBD before public launch)
