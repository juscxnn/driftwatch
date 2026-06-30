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
| `DEEPSEEK_API_KEY` | optional | Default DeepSeek key. **Optional** if every project uses BYOK. |
| `ENCRYPTION_KEY` | optional | 32+ char random string. Required only if any project uses BYOK (`/settings → LLM key`). Encrypts BYOK keys in `organizations.llm_key_encrypted` via pgcrypto. |
| `RESEND_API_KEY` | optional | Resend API key for drift alert emails (alerts are silent without this) |
| `ALERT_FROM_EMAIL` | optional | Sender address — must be a **verified sender** in Resend, e.g. `alerts@yourdomain.com` |
| `APP_URL` | yes (prod) | Absolute URL of the app, e.g. `https://driftwatch.example.com`. Used to build absolute URLs server-side and to scope server actions. |
| `CRON_SECRET` | yes (prod) | Random 32+ char string. Bearer token for `/api/cron/daily-runs`. |

## Migrations

All migrations in `supabase/migrations/` must be applied in order against the hosted Supabase project (either via `supabase db push` against a local Supabase, or paste each file into the SQL Editor on hosted Supabase):

- **`0001_init.sql`** — schema (9 tables), RLS policies, pgvector.
- **`0002_org_members_policies.sql`** — adds the missing SELECT policy on `org_members`.
- **`0003_fix_org_members_recursion.sql`** — replaces `0002`'s policy with a non-recursive one (the recursive policy caused `ERROR: infinite recursion detected in policy for relation "org_members"` at query time).
- **`0004_org_llm_key.sql`** — adds `organizations.llm_key_encrypted` + `pgcrypto` RPCs for BYOK.

## Deploy to production

1. Push the repo to GitHub.
2. In Vercel: "Import Project" → select the repo → set env vars above → deploy.
3. In Supabase: create a project → run **all four migration files** in `supabase/migrations/` in numeric order.
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
- `npm run smoke` — after deploy, run `APP_URL=https://your-app.vercel.app npm run smoke` to hit `/api/health` and a sample of public endpoints.

## Project layout

```
app/                       Next.js app router pages + API routes
  api/
    health/                GET  /api/health
    cron/daily-runs/       POST /api/cron/daily-runs  (Bearer $CRON_SECRET)
    inbox/                 GET  /api/inbox?limit&offset
    golden/                PATCH/DELETE /api/golden/[id]
    projects/              CRUD /api/projects, /api/projects/[id]
    projects/[id]/...      golden / sources / runs sub-resources
    runs/                  GET /api/runs/[id]
    run-results/[id]/      PATCH /api/run-results/[id]  (triage)
    sources/               CRUD on sources
    sample-rag/            POST demo RAG endpoint (no auth — for the sample inbox)

  (auth)/                  login, signup, callback
  (dashboard)/             authed shell — sidebar + main content
    inbox/                 InboxHome, DriftRow, FilterChips, RewordEditor,
                           useShortcuts, ShortcutsHelp, action runner
    projects/              list + per-project tabs (golden/sources/runs)
    projects/new/          3-step onboarding wizard
    runs/                  run detail page
    triage/                alternate triage view (kept for backwards compat)
    settings/              Org / Members / LLM key (BYOK) / Danger zone
  welcome/                 public marketing landing (also at / for unauthed)

components/                shared React components
  dialog/confirm-dialog    modal primitives
  field/input/textarea     form primitives
  button                   primary/secondary/ghost/danger, sm/md/lg, loading+success states
  toast                    provider + useToast() + global toast.success/error/info
  skeleton                 loading skeletons
  tooltip                  accessible tooltip with 4 positions
  empty-state + illustrations   6 custom SVG illustrations
  copy-button              click-to-copy with success state
  data-table               sortable + searchable table primitive
  sidebar + dashboard-shell    persistent left rail on md+
  icons                    SVG icon set (Inbox, Projects, Triage, plus, check, …)

lib/                       server-side helpers
  llm/                     LLM provider adapters (deepseek, openai) + BYOK-aware factory
  rag/                     RAG client + drift detection engine (golden runner, judge, alerts)
  supabase/                Supabase client factories (server / browser / admin)
  auth.ts                  session + AuthError
  http.ts                  ok/created/noContent/badRequest/notFound/forbidden/parseJson/handle
  inbox.ts                 loadInbox(orgId, {limit, offset})
  api.ts                   thin fetch wrapper + Projects/Golden/Sources/Runs/RunResults clients
  auth-errors.ts           friendly auth error mapping (testable)
  copy.ts                  user-facing copy in COPY.* (single source of truth)
  encrypt.ts               pgcrypto wrapper for BYOK
  request-id.ts            (middleware.ts owns the actual middleware; this is for shared helpers)
  actions/                 server actions: auth (app/(auth)/actions.ts), org (lib/actions/org.ts)

supabase/migrations/       SQL migrations (run in order: 0001 → 0002 → 0003 → 0004)
docs/                      design docs (design.md)
scripts/                   smoke.mjs deployment check
TESTING.md                 manual + automated test checklist
AGENTS.md                  repo notes for AI agents
```

## License

MIT (or your choice — TBD before public launch)

## BYOK

Each project can use the org's default LLM key (env `DEEPSEEK_API_KEY`) or its own key stored in `/settings → LLM key`. Per-project keys are encrypted at rest via pgcrypto (`ENCRYPTION_KEY` env var). The engine prefers the per-project key; falls back to env; errors clearly if neither is set.

## Keyboard shortcuts (inbox)

- `j` / `k` — move down / up through drift rows
- `a` — approve selected row
- `r` — open reword editor on selected row
- `e` — escalate (accept) selected row
- `?` — show help overlay
- `Esc` — close overlays
