/**
 * Auth helpers.
 *
 * These functions are the only way API routes should obtain the current user
 * and org context. They are deliberately small and throw `AuthError` on
 * failure so callers can convert to a 401 response at the edge.
 */

import { Uuid } from "./db-types";
import { createServerClient } from "./supabase/server";

export class AuthError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export interface SessionContext {
  userId: Uuid;
  email: string | null;
  /**
   * The user's "active" org. For v1 this is the first org membership we find
   * for the user; multi-org switching is out of scope.
   */
  orgId: Uuid;
  role: "owner" | "member";
}

/**
 * Return the current session, or throw AuthError(401).
 *
 * Resolves the user's primary org from `org_members`. If the user is not a
 * member of any org (e.g. just signed up but the server action hasn't run
 * yet), throws 403 — they need to finish onboarding before they can call the
 * API.
 */
export async function getSession(): Promise<SessionContext> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new AuthError("Not authenticated", 401);
  }

  const { data: memberRows, error: memberErr } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (memberErr) {
    throw new AuthError(`Failed to load org membership: ${memberErr.message}`, 500);
  }
  const member = memberRows?.[0];
  if (!member) {
    throw new AuthError(
      "User has no organization. Complete onboarding first.",
      403,
    );
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId: member.org_id,
    role: (member.role as "owner" | "member") ?? "member",
  };
}

/**
 * Verify that the current user is a member of the given org. Throws AuthError
 * (403) if not.
 *
 * If `expectedUserId` is provided, also verifies the session user matches.
 */
export async function requireOrg(
  orgId: Uuid,
  expectedUserId?: Uuid,
): Promise<SessionContext> {
  const session = await getSession();
  if (session.orgId !== orgId) {
    throw new AuthError("Forbidden: not a member of this organization", 403);
  }
  if (expectedUserId && session.userId !== expectedUserId) {
    throw new AuthError("Forbidden: user mismatch", 403);
  }
  return session;
}
