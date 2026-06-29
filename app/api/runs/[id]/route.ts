/**
 * /api/runs/[id] — get a run with all of its results.
 *
 * GET /api/runs/[id]
 *
 * Scope is enforced via the run's project's org_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handle, notFound, ok } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const supabase = await createServerClient();

    const allowedProjectIds =
      (await supabase.from("projects").select("id").eq("org_id", session.orgId))
        .data?.map((p: { id: string }) => p.id) ?? [];
    if (allowedProjectIds.length === 0) return notFound("Run not found");

    const { data: run, error: runErr } = await supabase
      .from("runs")
      .select("*")
      .eq("id", id)
      .in("project_id", allowedProjectIds)
      .maybeSingle();
    if (runErr) {
      return NextResponse.json({ error: runErr.message }, { status: 500 });
    }
    if (!run) return notFound("Run not found");

    const { data: results, error: resErr } = await supabase
      .from("run_results")
      .select("*")
      .eq("run_id", id)
      .order("created_at", { ascending: true });
    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }
    return ok({ run, results: results ?? [] });
  });
}
