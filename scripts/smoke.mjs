#!/usr/bin/env node
/**
 * Smoke test for the driftwatch deployment.
 *
 * Hits `/api/health` and a sampling of public endpoints to verify the
 * deploy is alive, all critical routes are wired up, and the auth path
 * is being enforced (401s where expected). Use this after every deploy
 * to catch regressions before users see them.
 *
 * Usage:
 *   APP_URL=https://driftwatch.example.com npm run smoke
 *
 * Requires no auth — it probes endpoints that should be reachable
 * without a session, and asserts 401s on the ones that require one.
 * Use this against staging or production.
 */

const BASE = process.env.APP_URL ?? 'http://localhost:3000';
let pass = 0;
let fail = 0;

async function probe(name, path, opts = {}) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      redirect: 'manual',
      headers: opts.headers ?? {},
      ...(opts.body ? { body: opts.body } : {}),
    });
    const expected = opts.expect ?? [200];
    const list = Array.isArray(expected) ? expected : [expected];
    if (list.includes(res.status)) {
      console.log(`  \x1b[32m✓\x1b[0m ${name.padEnd(38)} ${res.status}`);
      pass++;
      return { ok: true, res };
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${name.padEnd(38)} ${res.status} (expected ${list.join('|')})`);
      fail++;
      return { ok: false, res };
    }
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m ${name.padEnd(38)} threw: ${err.message}`);
    fail++;
    return { ok: false, err };
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log(`\n  Driftwatch smoke test → ${BASE}\n`);

  // 1. Health
  const health = await probe('health endpoint', '/api/health', { expect: 200 });
  if (health.ok) {
    const body = await getJson('/api/health');
    if (body?.ok) {
      console.log(`    service: ${body.service}, version: ${body.version}, env: ${body.env}`);
      const c = body.checks ?? {};
      const checks = ['supabase_configured', 'deepseek_configured', 'resend_configured', 'cron_secret_configured'];
      for (const k of checks) {
        const v = c[k] ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        console.log(`    ${v} ${k}: ${c[k]}`);
      }
    } else {
      console.log(`    \x1b[33mhealth.ok=false — service misconfigured\x1b[0m`);
      if (body?.checks) {
        for (const [k, v] of Object.entries(body.checks)) {
          if (!v) console.log(`    \x1b[31m✗\x1b[0m ${k}: ${v}`);
        }
      }
    }
  }

  // 2. Public pages should render (200) — these are server-rendered.
  await probe('landing redirect (/)', '/', { expect: [200, 307, 308] });

  // 3. Auth-required API routes should 401 without a session.
  await probe('GET /api/inbox', '/api/inbox', { expect: 401 });
  await probe('GET /api/projects', '/api/projects', { expect: 401 });
  await probe('POST /api/projects', '/api/projects', { expect: 401, method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });

  // 4. Cron endpoint should 401 without bearer, 500 if CRON_SECRET unset.
  await probe('POST /api/cron/daily-runs (no bearer)', '/api/cron/daily-runs', {
    expect: [401, 500],
    method: 'POST',
  });

  // 5. Sample RAG endpoint should respond to POST with a question.
  const sampleRes = await fetch(`${BASE}/api/sample-rag`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'What is your refund policy?' }),
  });
  if (sampleRes.ok) {
    const body = await sampleRes.json();
    if (typeof body?.answer === 'string') {
      console.log(`  \x1b[32m✓\x1b[0m POST /api/sample-rag           ${sampleRes.status} (answer: "${body.answer.slice(0, 40)}…")`);
      pass++;
    } else {
      console.log(`  \x1b[31m✗\x1b[0m POST /api/sample-rag           unexpected response shape`);
      fail++;
    }
  } else {
    console.log(`  \x1b[31m✗\x1b[0m POST /api/sample-rag           ${sampleRes.status}`);
    fail++;
  }
  // sample-rag with missing question should 400
  await probe('POST /api/sample-rag (no question)', '/api/sample-rag', {
    expect: [400],
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });

  // 6. Bad routes should 404.
  await probe('GET /not-a-real-route', '/not-a-real-route', { expect: 404 });

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});