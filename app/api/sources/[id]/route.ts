/**
 * /api/sources/[id] — delete a single source.
 *
 * DELETE /api/sources/[id]
 *
 * Scope is enforced by joining to projects.org_id = session.orgId.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handle, notFound, noContent } from "@/lib/http";
import { createServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
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
    if (allowedProjectIds.length === 0) return notFound("Source not found");

    const { error, count } = await supabase
      .from("sources")
      .delete({ count: "exact" })
      .eq("id", id)
      .in("project_id", allowedProjectIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!count || count === 0) return notFound("Source not found");
    return noContent();
  });
}
