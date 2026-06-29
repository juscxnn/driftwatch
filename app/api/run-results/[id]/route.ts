/**
 * /api/run-results/[id] — triage a single result.
 *
 * PATCH /api/run-results/[id]
 *   body: { review_status: 'approved' | 'reverted' | 'accepted' }
 *
 * Writes `review_status`, `reviewed_by`, and `reviewed_at`.
 * Scope is enforced via the run's project's org_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { handle, notFound, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const triageSchema = z.object({
  review_status: z.enum(["approved", "reverted", "accepted"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const parsed = await parseJson(req, triageSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();

    // Scope via run -> project -> org_id.
    const allowedProjectIds =
      (await supabase.from("projects").select("id").eq("org_id", session.orgId))
        .data?.map((p: { id: string }) => p.id) ?? [];
    if (allowedProjectIds.length === 0) return notFound("Run result not found");

    // First check the result belongs to a run that belongs to one of our
    // projects. We fetch the result's run_id, then verify the run's project.
    const { data: result, error: resFindErr } = await supabase
      .from("run_results")
      .select("id, run_id")
      .eq("id", id)
      .maybeSingle();
    if (resFindErr) {
      return NextResponse.json({ error: resFindErr.message }, { status: 500 });
    }
    if (!result) return notFound("Run result not found");
    const { data: run, error: runErr } = await supabase
      .from("runs")
      .select("id, project_id")
      .eq("id", result.run_id)
      .in("project_id", allowedProjectIds)
      .maybeSingle();
    if (runErr) {
      return NextResponse.json({ error: runErr.message }, { status: 500 });
    }
    if (!run) return notFound("Run result not found");

    const { data, error } = await supabase
      .from("run_results")
      .update({
        review_status: parsed.data.review_status,
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to update run result" },
        { status: 500 },
      );
    }
    return ok({ result: data });
  });
}
