/**
 * /api/projects/[id]/runs — list + trigger runs for a project.
 *
 * GET  /api/projects/[id]/runs   — list recent runs
 * POST /api/projects/[id]/runs   — trigger a manual run
 *
 * The POST handler kicks off `runProject` and returns the resulting run
 * summary inline. For v1 we keep runs synchronous; if a project has a
 * huge golden suite, the caller can move to a job queue later.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { created, handle, notFound, ok } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";
import { runProject } from "@/lib/rag/engine";

const triggerRunSchema = z
  .object({
    triggered_by: z.enum(["manual"]).optional(),
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
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (!project) return notFound("Project not found");
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .eq("project_id", id)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return ok({ runs: data ?? [] });
  });
}

export async function POST(
  req: NextRequest,
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

    // POST body is optional. Allow empty body or `{}` without erroring.
    let body: unknown = {};
    const text = await req.text();
    if (text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }
    const parsed = triggerRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const summary = await runProject(id, parsed.data.triggered_by ?? "manual");
    return created({ run: summary });
  });
}
