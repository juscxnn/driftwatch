/**
 * /api/golden/[id] — update + delete a single golden Q&A.
 *
 * PATCH  /api/golden/[id]   — partial update
 * DELETE /api/golden/[id]   — remove
 *
 * Ownership is enforced by joining to projects.org_id = session.orgId.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { handle, notFound, noContent, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const updateGoldenSchema = z
  .object({
    question: z.string().min(1).optional(),
    expected_answer: z.string().min(1).optional(),
    judge_rubric: z.string().min(1).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(50).optional(),
    active: z.boolean().optional(),
  })
  .strict();

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
    const parsed = await parseJson(req, updateGoldenSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();

    // Scope check: ensure the golden Q&A belongs to one of this org's projects.
    const allowedProjectIds =
      (await supabase.from("projects").select("id").eq("org_id", session.orgId))
        .data?.map((p: { id: string }) => p.id) ?? [];
    if (allowedProjectIds.length === 0) return notFound("Golden Q&A not found");

    const { data, error } = await supabase
      .from("golden_qa")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("project_id", allowedProjectIds)
      .select("*")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return notFound("Golden Q&A not found");
    return ok({ golden: data });
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const supabase = await createServerClient();

    // Scope check: ensure the golden Q&A belongs to one of this org's projects.
    const allowedProjectIds =
      (await supabase.from("projects").select("id").eq("org_id", session.orgId))
        .data?.map((p: { id: string }) => p.id) ?? [];
    if (allowedProjectIds.length === 0) return notFound("Golden Q&A not found");

    const { error, count } = await supabase
      .from("golden_qa")
      .delete({ count: "exact" })
      .eq("id", id)
      .in("project_id", allowedProjectIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!count || count === 0) return notFound("Golden Q&A not found");
    return noContent();
  });
}
