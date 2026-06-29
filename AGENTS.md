# AGENTS.md — RAG Drift Watcher

Repo-specific notes for AI coding agents. Skip what's obvious from the
filenames or generic Next.js/React knowledge.

## Stack at a glance

- Next.js 15 App Router on Vercel (`app/` route groups: `(auth)`, `(dashboard)`, `api/`)
- Supabase (Postgres + Auth + pgvector) — single migration at `supabase/migrations/0001_init.sql`
- LLM adapter pattern — factory at `lib/llm/index.ts`, default `deepseek`
- Cron endpoint `/api/cron/daily-runs` authenticated by bearer `CRON_SECRET`

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Lint | `npm run lint` — **prompts to configure ESLint on first run**, no `.eslintrc` exists yet |
| Build | `npm run build` |
| Test | `npm test` (vitest, runs `lib/**/*.test.ts` + `components/**/*.test.tsx` + `app/**/*.test.ts`) |
| Test (watch) | `npm run test:watch` |
| DB migrate | `npm run db:push` (runs `supabase db push`) |
| Reset local DB | `npm run db:reset` |

**Vitest covers pure logic only** (`formatRelative`, `ScoreBar` via `renderToString`, `friendlyAuthError`). Do not mock Supabase — API route and data-layer tests are out of scope for v1. Verification of the wired-up app is `typecheck` → `test` → `build`.

JSX in `.tsx` test files is handled by `@vitejs/plugin-react` (required for Vitest 4 / Rolldown).

**Verification order when shipping a change:** `typecheck` → `test` → `build`. Lint is optional until ESLint is configured.

## Design tokens

Single theme: mid-dark, warm-neutral grey, emerald accent. Tokens defined in `app/globals.css` `:root`, exposed as CSS variables, extended into Tailwind via `tailwind.config.js`. Class helpers (`.card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.input`, `.textarea`, `.label`, `.muted`, `.subtle`, `.error-text`, `.num`) are in `@layer components` of `globals.css` — reuse them, don't reinvent.

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#0E0F11` | Page background |
| `surface` | `#17181B` | Cards, panels |
| `surface-muted` | `#1D1F23` | Hover, subtle backgrounds |
| `border` | `#26282E` | Hairline 1px dividers |
| `border-strong` | `#34363C` | Focused inputs, selected rows |
| `text` | `#E8E9EB` | Primary copy |
| `text-muted` | `#8A8D94` | Labels, metadata |
| `text-subtle` | `#5C5F66` | Disabled, hints, placeholders |
| `brand` | `#10B981` | Emerald accent — means *healthy RAG* |
| `brand-hover` | `#34D399` | Brand hover (lighter, not darker) |
| `success-muted` | `#064E3B` | "Passed" badge background |
| `warn` / `warn-muted` | amber | "Drift detected" |
| `danger` / `danger-muted` | rose | "Broken / failed" |

Never use `bg-white`, `bg-black`, `text-white`, `text-black`, raw `zinc-*` utilities. Typography: weights 400/500 only, never 700+. Sizes are configured in `tailwind.config.js` (`text-2xs` through `text-3xl`).

## Supabase clients — pick the right one

| Factory | Where | When |
| --- | --- | --- |
| `getSupabaseServer()` / `createServerClient()` | `lib/supabase/server.ts` | Anything that runs in a request context (server components, route handlers, server actions). Cookie-based session, **RLS enforced**. |
| `getSupabaseBrowser()` | `lib/supabase/client.ts` | `'use client'` components only. Cached singleton. |
| `createAdminClient()` | `lib/supabase/admin.ts` | **Bypasses RLS** via service-role key. Server-only. Use ONLY for: cron jobs, signup/org bootstrap, `auth.admin.*` calls. Never expose to the browser. |

## Force-dynamic gotcha

Next 15 will try to statically prerender any page that reads cookies. Every page/layout/route that calls Supabase already has:

```ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

**If you add a new page that touches Supabase and forget both exports, the build will crash.** The 6 files that already declare them: `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/callback/route.ts`, `app/api/cron/daily-runs/route.ts`.

## API route conventions

- Use `getSession()` from `lib/auth.ts` — throws `AuthError(401)` if not signed in, `AuthError(403)` if user has no `org_members` row (mid-onboarding).
- Wrap route bodies with `handle()` from `lib/http.ts` — translates `AuthError` → HTTP response, generic `Error` → 500. Don't roll your own try/catch.
- Use `ok()`, `created()`, `noContent()`, `badRequest()`, `notFound()`, `forbidden()`, `parseJson()` from the same file. Don't `NextResponse.json(...)` ad-hoc.
- **Next 15 dynamic params:** `ctx.params` is `Promise<{ id: string }>`. Must `await` it (see `app/api/golden/[id]/route.ts`).
- **PostgREST scoping trap:** for filtering across multiple projects, use `.in('project_id', [arr])`, never `.eq('project_id', [arr])`. PostgREST treats the array as a literal string and returns 0 rows silently. See `app/api/golden/[id]/route.ts` for the canonical scope pattern.

## Org-scoping pattern

Every API read/write filters via `org_members.org_id`. Canonical shape:

```ts
const session = await getSession();          // lib/auth.ts
const { data: projects } = await sb
  .from('projects').select('id').eq('org_id', session.orgId);
const allowed = (projects ?? []).map(p => p.id);
sb.from('golden_qa').select('*').in('project_id', allowed);
```

Multi-org switching is out of scope (v1). The user's "active" org is the first `org_members` row by `created_at`.

## Signup / onboarding flow

- `signupAction` in `app/(auth)/actions.ts` creates the user via **`admin.auth.admin.createUser({ email_confirm: true })`**, not regular `auth.signUp`. Regular signUp raced the FK on hosted Supabase (auth.users row not yet visible to the org_members insert connection). Email confirmation is currently skipped — re-enable by moving the org_members insert into the `verifyOtp` callback.
- `setupOrgAction` (same file) is the recovery path: lets an authenticated user with no `org_members` row create their org inline.
- The dashboard (`app/(dashboard)/page.tsx`) renders `OnboardingForm` when `orgId` is null — no dead-end "contact support" screens.

## Conventions

- **All user-facing copy** lives in `lib/copy.ts` as `COPY.*`. Don't inline strings in components.
- **Types**: `lib/types.ts` (domain), `lib/db-types.ts` (branded `Uuid` etc.). No `any` / `as any` — repo grep should stay clean.
- **Tailwind only**, no UI kit. Reuse the `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.muted`, `.error-text` classes defined in `app/globals.css`.
- **Server actions** live in `app/(auth)/actions.ts` (auth) and feature-local files (e.g. project mutations). Always return a `{ ok: true } | { ok: false; error }` discriminated union.
- **Cron** has no user session — uses admin client exclusively.

## Env vars

See `.env.example`. Required for the app to boot:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never NEXT_PUBLIC_*
DEEPSEEK_API_KEY=
RESEND_API_KEY=
ALERT_FROM_EMAIL=
APP_URL=                          # used by lib/api.ts to build absolute URLs server-side
CRON_SECRET=                      # random 32+ char string; cron bearer
```

Without `SUPABASE_*` set, every Supabase-touching route returns 500. That's expected in a sandbox — not a bug.

## Deploy flow

1. Push to `main` → Vercel auto-redeploys (~1 min).
2. DB migrations are **not** automated. Run `supabase db push` against the target project manually, or paste `supabase/migrations/0001_init.sql` into the SQL editor. New schema changes need a new `NNNN_*.sql` file alongside.
3. Schedule a daily POST to `${APP_URL}/api/cron/daily-runs` with `Authorization: Bearer ${CRON_SECRET}`. The route accepts both POST and GET.

## Out of scope (intentional gaps)

- `notion` and `file` source kinds are stubs. URL scraping is the only working source.
- No SSO/SAML, no Slack/webhooks (email-only alerts via Resend).
- No background worker — runs are synchronous per request. The cron endpoint processes one project per iteration.
- Embeddings are stored as JSON-stringified into `vector(1536)` — works in practice but verify against your pgvector version before scaling.