/**
 * /api/projects/[id] — get / update / delete a single project.
 *
 * GET    /api/projects/[id]    — detail
 * PATCH  /api/projects/[id]    — update name, endpoint, threshold, models
 * DELETE /api/projects/[id]    — remove the project (cascades)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { handle, notFound, noContent, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    rag_endpoint_url: z.string().url().nullable().optional(),
    rag_endpoint_secret: z.string().min(1).max(500).nullable().optional(),
    pass_threshold: z.number().min(0).max(1).optional(),
    llm_provider: z.string().min(1).max(50).optional(),
    llm_model: z.string().min(1).max(100).optional(),
    judge_provider: z.string().min(1).max(50).optional(),
    judge_model: z.string().min(1).max(100).optional(),
  })
  .strict();

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
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return notFound("Project not found");
    return ok({ project: data });
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const parsed = await parseJson(req, updateProjectSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("projects")
      .update(parsed.data)
      .eq("id", id)
      .eq("org_id", session.orgId)
      .select("*")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return notFound("Project not found");
    return ok({ project: data });
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
    const { error, count } = await supabase
      .from("projects")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("org_id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!count || count === 0) return notFound("Project not found");
    return noContent();
  });
}
