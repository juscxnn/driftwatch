/**
 * /api/projects/[id]/golden — list + create golden Q&As for a project.
 *
 * GET  /api/projects/[id]/golden   — list (active by default, include_inactive=1 for all)
 * POST /api/projects/[id]/golden   — add a new golden Q&A
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { created, handle, notFound, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const createGoldenSchema = z.object({
  question: z.string().min(1),
  expected_answer: z.string().min(1),
  judge_rubric: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(50).optional(),
  active: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const supabase = await createServerClient();

    // Confirm the project belongs to this org.
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (projectErr) {
      return NextResponse.json({ error: projectErr.message }, { status: 500 });
    }
    if (!project) return notFound("Project not found");

    const includeInactive =
      new URL(req.url).searchParams.get("include_inactive") === "1";
    let query = supabase
      .from("golden_qa")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });
    if (!includeInactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return ok({ golden: data ?? [] });
  });
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const parsed = await parseJson(req, createGoldenSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (projectErr) {
      return NextResponse.json({ error: projectErr.message }, { status: 500 });
    }
    if (!project) return notFound("Project not found");

    const insert = {
      project_id: id,
      question: parsed.data.question,
      expected_answer: parsed.data.expected_answer,
      judge_rubric: parsed.data.judge_rubric ?? null,
      tags: parsed.data.tags ?? [],
      active: parsed.data.active ?? true,
    };
    const { data, error } = await supabase
      .from("golden_qa")
      .insert(insert)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create golden Q&A" },
        { status: 500 },
      );
    }
    return created({ golden: data });
  });
}
