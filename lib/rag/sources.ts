/**
 * Source watcher.
 *
 * For each `sources` row, periodically:
 *   1. Fetch the content (URL scrape / Notion / file download).
 *   2. SHA-256 hash it. Compare to `last_hash`.
 *   3. If changed, write a `source_changes` row, re-embed chunks into
 *      `source_chunks`, then trigger a drift run.
 *
 * For v1 only `kind = 'url'` is fully implemented. `notion` and `file` are
 * documented no-ops with TODOs.
 */

import { createAdminClient } from "../supabase/admin";
import { chunkText } from "./chunker";
import { embedChunks } from "./embedder";
import { runProject } from "./engine";
import { Uuid } from "../db-types";

export interface RefreshSourceResult {
  sourceId: Uuid;
  changed: boolean;
  skipped: boolean;
  reason?: string;
  runId?: Uuid;
  newHash?: string;
}

const SUPPORTED_KINDS_V1 = new Set(["url"]);

/**
 * Refresh a single source. Compares its current content hash against the
 * stored `last_hash`. If changed, persists the new state, re-embeds chunks,
 * and triggers a drift run with `triggered_by='source_change'`.
 *
 * Idempotent: if you call it on an unchanged source, it returns
 * `{ changed: false }` quickly.
 */
export async function refreshSource(
  sourceId: Uuid,
): Promise<RefreshSourceResult> {
  const supabase = createAdminClient();
  const { data: source, error: srcErr } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (srcErr || !source) {
    return {
      sourceId,
      changed: false,
      skipped: true,
      reason: `source not found: ${srcErr?.message ?? "no row"}`,
    };
  }

  if (!SUPPORTED_KINDS_V1.has(source.kind)) {
    // TODO: implement notion + file source kinds.
    return {
      sourceId,
      changed: false,
      skipped: true,
      reason: `source kind '${source.kind}' not implemented in v1`,
    };
  }

  let content: string;
  try {
    content = await fetchUrlText(source.uri);
  } catch (err) {
    return {
      sourceId,
      changed: false,
      skipped: true,
      reason: `fetch failed: ${(err as Error).message ?? "unknown"}`,
    };
  }

  const newHash = await sha256Hex(content);
  if (newHash === source.last_hash) {
    // Update last_fetched_at so the caller knows we tried, but don't write
    // a source_changes row.
    await supabase
      .from("sources")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", sourceId);
    return { sourceId, changed: false, skipped: true, newHash };
  }

  // 1. Record the change.
  const { error: changeErr } = await supabase.from("source_changes").insert({
    source_id: sourceId,
    old_hash: source.last_hash,
    new_hash: newHash,
    diff_summary: null, // populated by a future LLM summarization step
  });
  if (changeErr) {
    return {
      sourceId,
      changed: true,
      skipped: true,
      reason: `failed to write source_change: ${changeErr.message}`,
      newHash,
    };
  }

  // 2. Re-embed chunks. First wipe the old chunks (cascading FK is set, but
  // explicit delete is clearer and avoids surprises if cascade is dropped).
  await supabase.from("source_chunks").delete().eq("source_id", sourceId);

  const chunks = chunkText(content);
  if (chunks.length > 0) {
    const { embeddings, model } = await embedChunks({ chunks });
    const rows = chunks.map((contentVal, idx) => ({
      source_id: sourceId,
      chunk_index: idx,
      content: contentVal,
      embedding: JSON.stringify(embeddings[idx] ?? []),
      token_count: Math.ceil(contentVal.length / 4),
      // Surface the model in a side-channel by leaving a comment in metadata:
      // we don't have a metadata column, so we just rely on the rows being
      // tagged with the model that produced them (callers can query a future
      // "embedding_models" table if needed).
    }));
    void model;
    const { error: chunksErr } = await supabase
      .from("source_chunks")
      .insert(rows);
    if (chunksErr) {
      return {
        sourceId,
        changed: true,
        skipped: true,
        reason: `failed to write source_chunks: ${chunksErr.message}`,
        newHash,
      };
    }
  }

  // 3. Update the source row.
  await supabase
    .from("sources")
    .update({
      last_hash: newHash,
      last_fetched_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  // 4. Trigger a run. Wrap in try/catch so a run failure doesn't pretend
  // the source refresh failed.
  let runId: Uuid | undefined;
  try {
    const summary = await runProject(source.project_id, "source_change");
    runId = summary.runId;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[sources] runProject after source change failed for ${sourceId}:`,
      err,
    );
  }

  return { sourceId, changed: true, skipped: false, newHash, runId };
}

/**
 * Refresh every URL-kind source in the database. Used by the daily cron to
 * detect drift across the entire customer base. Returns per-source results.
 */
export async function refreshAllSources(): Promise<RefreshSourceResult[]> {
  const supabase = createAdminClient();
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, kind")
    .eq("kind", "url");
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(`[sources] failed to list sources: ${error.message}`);
    return [];
  }
  const out: RefreshSourceResult[] = [];
  for (const row of sources ?? []) {
    // Sequential to avoid hammering downstream endpoints.
    out.push(await refreshSource(row.id));
  }
  return out;
}

/* --------------------------------------------------------------------- */
/* internals                                                             */
/* --------------------------------------------------------------------- */

/**
 * Fetch a URL and return its visible text. HTML tags are stripped with a
 * regex; we intentionally don't pull in cheerio for v1 — accuracy here is
 * not critical because the source_chunks embeddings are diagnostic-only.
 */
async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "RAG-Drift-Watcher/0.1 (+https://ragdrift.example)",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (contentType.includes("text/plain")) return raw.trim();
  if (contentType.includes("html") || raw.trim().startsWith("<")) {
    return htmlToText(raw);
  }
  return raw.trim();
}

/**
 * Naive HTML -> text. Strips script/style content, then all tags, then
 * collapses whitespace. Not perfect; not meant to be.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute SHA-256 of a string and return it as a lowercase hex digest.
 * Uses Web Crypto so it works in both Node 18+ and edge runtimes.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}
