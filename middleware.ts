import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';
const ID_PATTERN = /^[a-z0-9-]{6,64}$/i;

export function middleware(req: NextRequest) {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  const id = incoming && ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, id);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set(REQUEST_ID_HEADER, id);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

/**
 * Read the request id (set by middleware) from server-side request headers.
 * Safe to use inside Server Components, Route Handlers, and Server Actions
 * via `headers()` from `next/headers`.
 */
export function getRequestId(headers: Headers): string {
  return headers.get('x-request-id') ?? 'no-req-id';
}