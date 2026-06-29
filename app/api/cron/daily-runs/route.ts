/**
 * /api/cron/daily-runs — invoked by Supabase / Vercel cron once a day.
 *
 * Auth: Bearer $CRON_SECRET. No user session.
 *
 * For every project, if no run has been started in the last 12h, trigger a
 * run. Returns a JSON summary of what was triggered / skipped.
 */

import { NextRequest, NextResponse } from "next/server";
import { runProject } from "@/lib/rag/engine";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron reads process env and runs per request; never statically prerender.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IDEMPOTENCY_WINDOW_HOURS = 12;

interface ProjectSummary {
  projectId: string;
  name: string;
  triggered: boolean;
  reason?: string;
  runId?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check the bearer.
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 500 },
    );
  }
  const provided = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7)
    : auth;
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, name, rag_endpoint_url");
  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }
  const cutoff = new Date(
    Date.now() - IDEMPOTENCY_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const summaries: ProjectSummary[] = [];
  for (const p of projects ?? []) {
    if (!p.rag_endpoint_url) {
      summaries.push({
        projectId: p.id,
        name: p.name,
        triggered: false,
        reason: "no rag_endpoint_url configured",
      });
      continue;
    }
    // Check for a recent run.
    const { data: recent } = await supabase
      .from("runs")
      .select("id")
      .eq("project_id", p.id)
      .gte("started_at", cutoff)
      .order("started_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      summaries.push({
        projectId: p.id,
        name: p.name,
        triggered: false,
        reason: "run started within the last 12h",
      });
      continue;
    }
    try {
      const summary = await runProject(p.id, "cron");
      summaries.push({
        projectId: p.id,
        name: p.name,
        triggered: true,
        runId: summary.runId,
      });
    } catch (err) {
      summaries.push({
        projectId: p.id,
        name: p.name,
        triggered: false,
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    projects: summaries,
  });
}

// Some cron providers (e.g. Vercel) send GET; we accept either for ergonomics.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
