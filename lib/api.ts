// Thin fetch wrapper for the internal Next.js API routes.
//
// In server components, server actions, and route handlers the session
// cookie is sent automatically by the browser/fetch implementation, so
// the backend's auth helpers can resolve the user from the request.
// On the server we use the absolute APP_URL to build the request URL.
import { getSupabaseBrowser } from './supabase/client';

export type ApiError = {
  ok: false;
  status: number;
  message: string;
  details?: unknown;
};

export type ApiOk<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ApiResult<T> = ApiOk<T> | ApiError;

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.APP_URL ?? 'http://localhost:3000';
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  if (typeof window !== 'undefined') {
    // Attach the Supabase access token so the backend can resolve the user
    // even if cookies aren't being read for some reason.
    try {
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // Fall back to cookie-only auth if Supabase isn't configured.
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    cache: 'no-store',
    ...init,
  });

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    let message: string | null = null;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { error?: unknown; message?: unknown };
      if (typeof obj.error === 'string') message = obj.error;
      else if (typeof obj.message === 'string') message = obj.message;
    }
    throw new ApiClientError(message ?? `Request failed with status ${res.status}`, res.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>('POST', path, body, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>('PATCH', path, body, init),
  del: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
};

// === Typed resource helpers ===
// Each helper matches one backend route. Keep them flat and boring.

import type {
  Project,
  GoldenQA,
  Source,
  Run,
  RunResult,
  TriagePatch,
} from './types';

export const Projects = {
  list: () => api.get<Project[]>('/api/projects'),
  get: (id: string) => api.get<Project>(`/api/projects/${id}`),
  create: (body: { name: string; rag_endpoint_url?: string; rag_endpoint_secret?: string }) =>
    api.post<Project>('/api/projects', body),
  update: (
    id: string,
    body: Partial<Pick<Project, 'name' | 'rag_endpoint_url' | 'rag_endpoint_secret'>>,
  ) => api.patch<Project>(`/api/projects/${id}`, body),
  remove: (id: string) => api.del<{ ok: true }>(`/api/projects/${id}`),
};

export const Golden = {
  list: (projectId: string) => api.get<GoldenQA[]>(`/api/projects/${projectId}/golden`),
  create: (
    projectId: string,
    body: {
      question: string;
      expected_answer: string;
      judge_rubric?: string;
      tags?: string[];
    },
  ) => api.post<GoldenQA>(`/api/projects/${projectId}/golden`, body),
  update: (id: string, body: Partial<Omit<GoldenQA, 'id' | 'project_id' | 'created_at'>>) =>
    api.patch<GoldenQA>(`/api/golden/${id}`, body),
  remove: (id: string) => api.del<{ ok: true }>(`/api/golden/${id}`),
};

export const Sources = {
  list: (projectId: string) => api.get<Source[]>(`/api/projects/${projectId}/sources`),
  create: (projectId: string, body: { kind: 'url' | 'notion' | 'file'; uri: string; title?: string }) =>
    api.post<Source>(`/api/projects/${projectId}/sources`, body),
  remove: (id: string) => api.del<{ ok: true }>(`/api/sources/${id}`),
  refresh: (id: string) => api.post<Source>(`/api/sources/${id}/refresh`),
};

export const Runs = {
  list: (projectId: string) => api.get<Run[]>(`/api/projects/${projectId}/runs`),
  trigger: (projectId: string) => api.post<Run>(`/api/projects/${projectId}/runs`),
  get: (id: string) => api.get<Run>(`/api/runs/${id}`),
};

export const RunResults = {
  triage: (id: string, body: TriagePatch) => api.patch<RunResult>(`/api/run-results/${id}`, body),
};
