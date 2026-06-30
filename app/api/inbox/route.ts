/**
 * /api/inbox — pending non-passing run results for the active org.
 *
 * GET /api/inbox?limit=N&offset=N
 *
 * `limit` is optional (default 50, max 100).
 * `offset` is optional (default 0) — used for "Load more" pagination.
 * Returns `InboxResponse`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { loadInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const session = await getSession();
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const offset = parseLimit(url.searchParams.get("offset"));
    const inbox = await loadInbox(session.orgId, { limit, offset });
    return ok(inbox);
  });
}

function parseLimit(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
