# TESTING.md — Driftwatch

How to verify the app actually works end-to-end. Run this after every deploy, before telling users there's a new release.

## 0. Pre-flight (5 min)

Before any feature test, make sure these are true:

- [ ] Build is green on Vercel (or `npm run build` locally)
- [ ] `npm run typecheck` exits clean
- [ ] `npm test` → 22 tests, all passing
- [ ] `npm run smoke` against your target URL → 0 failures (see "Smoke" below)

If any of those fail, fix them first. Feature testing on a broken build wastes time.

## 1. Smoke test (30 sec)

```bash
APP_URL=https://your-app.vercel.app npm run smoke
```

Should print a green checkmark list:
- `/api/health` returns `ok: true` with all four checks true
- `/` responds (200, 307, or 308)
- `/api/inbox`, `/api/projects` return **401 without a session** — auth is working
- `/api/cron/daily-runs` returns **401 or 500** without bearer — cron auth is working
- `/api/sample-rag` returns a canned answer for a known question, **400 for missing input**

If anything fails, paste the output.

## 2. Happy-path, fresh signup (3 min)

Open the prod URL in an incognito tab. Walk through this exact sequence:

1. **Land on /login.** Click "Sign up" link.
2. **Signup form.** Email `test-{timestamp}@example.com`, password `correct-horse-battery-staple`, org name "Test Org Inc.". Submit.
3. **Expect: instant redirect to /, inbox showing** "Watch your first RAG system" with two buttons (Create your first project / Try with sample data).
4. **Click "Try with sample data".** Button shows "Seeding…" for ~2–4 seconds.
5. **Expect: page refreshes to inbox with ~8 drift rows** (refund policy + integrations will always drift; password/annual/security flakily drift). Each row shows score, latency, judge reasoning.

If step 5 doesn't appear: open devtools console, look for `[setupOrgAction]` or `[seedSampleDataAction]` logs, paste them.

6. **Click "Approve" on a row.** Row disappears. Page may briefly re-render.

7. **Navigate to /projects.** Sample project "Acme Support (sample)" appears in the list. Click it.

8. **Click "Sources" tab.** Shows the sample project's URL endpoint (`https://.../api/sample-rag`).

9. **Click "Runs" tab.** Shows the recent manual run with pass/fail counts.

10. **Click the run.** Shows per-question results.

11. **Sign out.** Returns to /login.

## 3. Login as existing user (1 min)

1. Open prod URL, **do not use incognito** if you have a cookie set.
2. Sign out (top right) if needed.
3. Log back in with the same email + password from step 2.
4. **Expect: lands on /, shows the inbox with the unapproved drifts from step 2**.
5. Approve one more row, navigate to /triage, see that the org-level triage queue no longer lists the approved one.

## 4. Custom project (3 min)

Don't use the sample RAG. Point at your own:

1. On /, click "Create your first project" (not the sample button this time).
2. Name: "My Custom Project". Endpoint URL: **any** URL you control (use https://httpbin.org/post for now).
3. Save.
4. Lands on project detail.
5. Click **"Golden Q&A"** tab → "Add question". Question "test", expected "yes". Save.
6. Repeat 2–3 more times so you have a few questions.
7. Click **"Runs"** tab → "Run now". Spinner → completes in ~5 sec.
8. Most likely all pass (httpbin returns the request which the judge rates favorably). Click into a run to see per-question results.

## 5. Edge cases (1 min each)

- **Bad URL on project create.** Try `not-a-url`. Expect: inline error "must start with http://".
- **Empty signup.** Click submit with all fields blank. Expect: inline error "Please enter email…".
- **Short password.** Type "abc" in password, submit. Expect: "Password must be at least 8 characters."
- **Already-registered email.** Try signing up with the same email as your test account. Expect: "An account with that email already exists. Try signing in."
- **Wrong password.** Log in with the test email but wrong password. Expect: "Wrong email or password."
- **Hit /api/inbox directly** with no auth header from a fresh incognito: should return 401 `{ "error": "Not authenticated" }`.

## 6. Drift detection reality check (1 min)

This is the actual product working end-to-end:

1. Sign in. Note the inbox drift count (e.g., 7).
2. **Click "Reword Q" on the refund policy row.** That marks it as `reverted` and removes from the inbox count.
3. Refresh. Drift count drops by one.
4. **Reload the inbox.** The reworded row is gone; the other 7 remain pending.
5. (Optional) Modify a source (the sample RAG is read-only, so this requires a real project) and re-run to see real source-change drift.

## 7. Error path (1 min)

- **Hit /random-bad-route on prod.** Expect themed 404 page with "Back to inbox" button.
- **Server error reproduction.** Hard to repro without a code path, but if you do trip one, expect themed error page with "Try again" button.

## What's NOT covered by manual tests (deferred)

- E2E automation (Playwright) — not installed
- API route tests — would require mocking Supabase
- Engine logic (judge prompt, chunker) — pure logic but tied to IO
- Real LLM cost measurement — needs a separate benchmarking run

Add automated tests for these when the manual checklist gets tedious to run on every release.

## When something is broken

1. Check `/api/health` — is the deploy healthy?
2. Run `npm run smoke` — do critical endpoints respond?
3. Open browser devtools, reproduce, paste console errors with `[action-name]` tags
4. If still stuck, check Vercel build log for the failing deployment
