/**
 * Small HTTP helpers for API route handlers.
 *
 * Centralizes:
 *   - JSON response shapes (success vs error)
 *   - Zod error -> 400 translation
 *   - Async dynamic params (Next 15 returns Promise<{ id: string }>)
 *   - try/catch wrapping so route bodies stay small
 */

import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { AuthError } from "./auth";

export interface ApiError {
  error: string;
  details?: unknown;
}

export function ok<T>(data: T, init: ResponseInit = {}): NextResponse<T> {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message = "Forbidden"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function serverError(message = "Internal server error"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Parse a JSON request body against a zod schema. Returns either the parsed
 * data or a 400 NextResponse.
 */
export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse<ApiError> }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: badRequest("Invalid JSON body") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, res: badRequest("Invalid request body", flattenZodError(parsed.error)) };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Convert a ZodError into a JSON-friendly shape: { path: message }.
 */
export function flattenZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Wrap a route handler so AuthError -> 401, generic Error -> 500.
 *
 * The generic is intentionally unconstrained: route bodies often return a
 * union of different response shapes (e.g. `NextResponse<X> | NextResponse<Y>`)
 * and we don't want to force a single unified type at the call site.
 */
export function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return fn().catch((err: unknown) => {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    // eslint-disable-next-line no-console
    console.error("[api] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  });
}
