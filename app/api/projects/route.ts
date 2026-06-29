/**
 * /api/projects — list + create.
 *
 * GET  /api/projects                — list projects for the user's org
 * POST /api/projects                — create a new project
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { created, handle, ok, parseJson } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  rag_endpoint_url: z.string().url().nullable().optional(),
  rag_endpoint_secret: z.string().min(1).max(500).nullable().optional(),
  pass_threshold: z.number().min(0).max(1).optional(),
  llm_provider: z.string().min(1).max(50).optional(),
  llm_model: z.string().min(1).max(100).optional(),
  judge_provider: z.string().min(1).max(50).optional(),
  judge_model: z.string().min(1).max(100).optional(),
});

export async function GET(): Promise<NextResponse> {
  return handle(async () => {
    const session = await getSession();
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return ok({ projects: data ?? [] });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const session = await getSession();
    const parsed = await parseJson(req, createProjectSchema);
    if (!parsed.ok) return parsed.res;
    const supabase = await createServerClient();
    const insert = {
      org_id: session.orgId,
      name: parsed.data.name,
      rag_endpoint_url: parsed.data.rag_endpoint_url ?? null,
      rag_endpoint_secret: parsed.data.rag_endpoint_secret ?? null,
      pass_threshold: parsed.data.pass_threshold ?? 0.7,
      llm_provider: parsed.data.llm_provider ?? "deepseek",
      llm_model: parsed.data.llm_model ?? "deepseek-chat",
      judge_provider: parsed.data.judge_provider ?? "deepseek",
      judge_model: parsed.data.judge_model ?? "deepseek-chat",
    };
    const { data, error } = await supabase
      .from("projects")
      .insert(insert)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create project" },
        { status: 500 },
      );
    }
    return created({ project: data });
  });
}
