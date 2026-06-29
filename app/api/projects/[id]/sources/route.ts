/**
 * /api/projects/[id]/sources — list + add sources for a project.
 *
 * GET  /api/projects/[id]/sources   — list
 * POST /api/projects/[id]/sources   — add a new source
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { created, handle, notFound, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const createSourceSchema = z.object({
  kind: z.enum(["url", "notion", "file"]),
  uri: z.string().min(1).max(2000),
  title: z.string().min(1).max(500).nullable().optional(),
});

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
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (!project) return notFound("Project not found");
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return ok({ sources: data ?? [] });
  });
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const parsed = await parseJson(req, createSourceSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (!project) return notFound("Project not found");

    const insert = {
      project_id: id,
      kind: parsed.data.kind,
      uri: parsed.data.uri,
      title: parsed.data.title ?? null,
    };
    const { data, error } = await supabase
      .from("sources")
      .insert(insert)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create source" },
        { status: 500 },
      );
    }
    return created({ source: data });
  });
}
