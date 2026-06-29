/**
 * RAG client — call the customer's RAG endpoint.
 *
 * Tolerant: accepts JSON `{ answer: string }`, JSON `{ output: string }`,
 * plain text, or anything with a string-coercible answer. Used by the drift
 * engine to fetch answers for golden Q&A pairs.
 *
 * The customer's endpoint is treated as untrusted: a 30s default timeout
 * (configurable) caps the blast radius of a misbehaving target.
 */

export interface CallRagEndpointInput {
  url: string;
  /** Optional bearer token to send as `Authorization: Bearer <secret>`. */
  secret?: string | null;
  question: string;
  /** Default 30_000ms. */
  timeoutMs?: number;
  /** Optional additional headers (e.g. for X-Tenant-ID). */
  headers?: Record<string, string>;
}

export interface CallRagEndpointResult {
  answer: string;
  /** Wall-clock latency of the call in milliseconds. */
  latencyMs: number;
}

export class RagClientError extends Error {
  public readonly statusCode: number;
  public readonly cause?: unknown;
  constructor(message: string, statusCode: number, cause?: unknown) {
    super(message);
    this.name = "RagClientError";
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Coerce a parsed body to a string answer. Order of preference:
 * 1. `answer` field on the root object
 * 2. `output` / `response` / `result` field
 * 3. The whole body, if it's a string
 * 4. The whole body, JSON-stringified
 */
function extractAnswer(parsed: unknown): string {
  if (typeof parsed === "string") return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["answer", "output", "response", "result"]) {
      const v = obj[key];
      if (typeof v === "string" && v.length > 0) return v;
    }
    // Fall back to a stringified version so the judge always has something.
    try {
      return JSON.stringify(parsed);
    } catch {
      return "";
    }
  }
  return parsed == null ? "" : String(parsed);
}

/**
 * POST a question to the customer's RAG endpoint and return the answer +
 * observed latency. See RagClientError on non-2xx / timeout.
 */
export async function callRagEndpoint(
  input: CallRagEndpointInput,
): Promise<CallRagEndpointResult> {
  if (!input.url) {
    throw new RagClientError("RAG endpoint URL is required", 400);
  }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain;q=0.9, */*;q=0.5",
    ...(input.headers ?? {}),
  };
  if (input.secret) {
    headers.Authorization = `Bearer ${input.secret}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(input.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ question: input.question }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new RagClientError(
        `RAG endpoint timed out after ${timeoutMs}ms`,
        504,
        err,
      );
    }
    throw new RagClientError(
      `Network error calling RAG endpoint: ${(err as Error).message ?? "unknown"}`,
      502,
      err,
    );
  }
  clearTimeout(timeout);
  const latencyMs = Date.now() - started;

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
    throw new RagClientError(
      `RAG endpoint returned ${res.status} ${res.statusText}: ${detail.slice(0, 500)}`,
      502,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  let parsed: unknown = raw;
  if (contentType.includes("json") || raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Keep raw; extractAnswer will coerce it.
    }
  }
  const answer = extractAnswer(parsed);
  if (!answer) {
    throw new RagClientError(
      "RAG endpoint returned an empty answer",
      502,
    );
  }
  return { answer, latencyMs };
}
