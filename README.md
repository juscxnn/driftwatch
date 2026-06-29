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
npx supabase db push   # applies supabase/migrations/

# 3. Configure env
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY, RESEND_API_KEY

# 4. Run
npm run dev
```

App will be on http://localhost:3000.

## Deploy to production

1. Push the repo to GitHub.
2. In Vercel: "Import Project" → select the repo → set env vars → deploy.
3. In Supabase: create a project → run the SQL in `supabase/migrations/0001_init.sql`.
4. Configure your custom cron (Vercel Cron or Supabase pg_cron) to POST to
   `https://your-app.vercel.app/api/cron/daily-runs` with header
   `Authorization: Bearer $CRON_SECRET` once per day.

## Architecture

See [docs/design.md](docs/design.md) for the full design spec.

## Project layout

```
app/                  Next.js app router pages + API routes
  api/                REST endpoints
  (auth)/             login, signup, callback
  (dashboard)/        logged-in pages
components/           shared React components
lib/                  server-side helpers
  llm/                LLM provider adapters
  rag/                RAG client + drift detection engine
  supabase/           Supabase client factories
supabase/migrations/  SQL migrations
docs/                 design docs
scripts/              one-off scripts
```

## License

MIT (or your choice — TBD before public launch)
