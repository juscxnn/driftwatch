/**
 * /api/sources/[id]/refresh — force a refresh of a single source.
 *
 * POST /api/sources/[id]/refresh
 *
 * Triggers fetch + hash compare + re-embed + drift run (if changed). Scope
 * is enforced via the source's project's org_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handle, notFound, ok } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";
import { refreshSource } from "@/lib/rag/sources";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession();
    const supabase = await createServerClient();

    // Verify ownership.
    const allowedProjectIds =
      (await supabase.from("projects").select("id").eq("org_id", session.orgId))
        .data?.map((p: { id: string }) => p.id) ?? [];
    if (allowedProjectIds.length === 0) return notFound("Source not found");
    const { data: source } = await supabase
      .from("sources")
      .select("id")
      .eq("id", id)
      .in("project_id", allowedProjectIds)
      .maybeSingle();
    if (!source) return notFound("Source not found");

    const result = await refreshSource(id);
    return ok({ result });
  });
}
