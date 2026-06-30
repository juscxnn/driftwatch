/**
 * Drift detection engine.
 *
 * The core loop:
 *   1. Load project + active golden Q&As.
 *   2. For each Q, call the customer's RAG endpoint.
 *   3. Score the answer with the LLM judge.
 *   4. Persist runs + run_results.
 *   5. Email the customer if anything failed (best-effort).
 *
 * BYOK: `runProject` decrypts the org's stored LLM key once at the start
 * of the run and threads the resulting `apiKey` down through every judge
 * call. If the org has no stored key we fall back to the env-based
 * provider.
 *
 * Two entry points:
 *   - `runProject(projectId, triggeredBy)`  — full run, persists results.
 *   - `judgeAnswer({...})`                 — pure scoring function, useful
 *                                              for ad-hoc evaluation.
 */

import { Resend } from "resend";
import { z } from "zod";
import { getLLM, buildLLM, LLMProvider } from "../llm";
import { callRagEndpoint, RagClientError } from "./client";
import { TriggerSource, Uuid } from "../db-types";
import { createAdminClient } from "../supabase/admin";
import { decryptSecret, encryptionConfigured } from "../encrypt";

export interface JudgeInput {
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  rubric?: string | null;
}

export interface JudgeResult {
  /** 0.0 - 1.0 */
  score: number;
  reasoning: string;
}

const judgeJsonSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});

const judgeSystemPrompt = `You are an impartial evaluator scoring whether an actual answer correctly addresses a question.

You MUST respond with a single JSON object (no prose, no markdown fences) of the form:
{"score": <number between 0.0 and 1.0>, "reasoning": "<one or two sentence explanation>"}.

Scoring guide:
- 1.0: Fully correct and complete, aligned with the expected answer.
- 0.7-0.9: Substantially correct; minor omissions or imprecisions.
- 0.4-0.6: Partially correct; missing key facts or contains notable errors.
- 0.0-0.3: Wrong, hallucinated, or off-topic.

Be strict. If the actual answer contradicts the expected answer, score < 0.5.`;

function buildJudgeUserPrompt(input: JudgeInput): string {
  const rubricBlock = input.rubric
    ? `\nRubric:\n${input.rubric}\n`
    : "";
  return `Question:
${input.question}

Expected answer:
${input.expectedAnswer}
${rubricBlock}
Actual answer:
${input.actualAnswer}

Return JSON only.`;
}

/**
 * Score an answer using the LLM judge. Pure function — does not write to
 * the database. Uses the default LLM provider.
 *
 * Accepts an optional `apiKey` override (BYOK) and `provider` override.
 * If both are omitted, falls back to the env-based default via `getLLM()`.
 */
export async function judgeAnswer(
  input: JudgeInput,
  opts: {
    apiKey?: string | null;
    provider?: string | null;
  } = {},
): Promise<JudgeResult> {
  if (!input.actualAnswer || input.actualAnswer.trim().length === 0) {
    return {
      score: 0,
      reasoning: "RAG endpoint returned an empty answer.",
    };
  }
  let llm: LLMProvider;
  if (opts.apiKey || opts.provider) {
    llm = buildLLM({ apiKey: opts.apiKey, provider: opts.provider });
  } else {
    llm = getLLM();
  }
  return judgeAnswerWith(input, llm);
}

/**
 * Same as `judgeAnswer` but allows injecting a specific provider (useful in
 * tests). Tries JSON-mode first, then falls back to extracting JSON from
 * the first {...} block if the provider returned prose.
 */
export async function judgeAnswerWith(
  input: JudgeInput,
  provider: LLMProvider,
): Promise<JudgeResult> {
  const messages = [
    { role: "system" as const, content: judgeSystemPrompt },
    { role: "user" as const, content: buildJudgeUserPrompt(input) },
  ];
  const res = await provider.chat(messages, {
    temperature: 0,
    responseFormat: "json",
  });
  return parseJudgeResponse(res.content);
}

/**
 * Parse a judge response. Tolerant: if JSON-mode returned valid JSON, use
 * it; otherwise extract the first {...} block from prose.
 */
function parseJudgeResponse(raw: string): JudgeResult {
  const trimmed = raw.trim();
  // 1. Try direct parse.
  try {
    const obj = JSON.parse(trimmed);
    const parsed = judgeJsonSchema.safeParse(obj);
    if (parsed.success) {
      return { score: parsed.data.score, reasoning: parsed.data.reasoning };
    }
  } catch {
    // fall through
  }
  // 2. Extract the first JSON object.
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      const parsed = judgeJsonSchema.safeParse(obj);
      if (parsed.success) {
        return { score: parsed.data.score, reasoning: parsed.data.reasoning };
      }
    } catch {
      // fall through
    }
  }
  // 3. Give up — treat the whole text as reasoning, score 0.
  return {
    score: 0,
    reasoning: trimmed || "Judge returned no parseable response.",
  };
}

export interface RunSummary {
  runId: Uuid;
  projectId: Uuid;
  total: number;
  passed: number;
  failed: number;
  status: "completed" | "failed";
  triggeredBy: TriggerSource;
  failedQuestionIds: Uuid[];
  error?: string;
}

/**
 * Resolve the org's stored LLM API key (decrypting once). Returns null
 * when the org has no stored key. Throws if a stored key exists but
 * `ENCRYPTION_KEY` is missing from the environment — the alternative
 * would be silently skipping encryption and using a no-op path.
 */
async function resolveOrgLlmApiKey(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("llm_key_encrypted, llm_key_hint")
    .eq("id", orgId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[engine] failed to load org LLM key:", error.message);
    return null;
  }
  const ciphertext = (data?.llm_key_encrypted as unknown);
  if (ciphertext == null || ciphertext === "") return null;
  // We persist the ciphertext as base64 text (see migration 0004). Treat
  // any non-empty string as such.
  if (typeof ciphertext !== "string") return null;
  try {
    return await decryptSecret(ciphertext);
  } catch (err) {
    if (!encryptionConfigured()) {
      // eslint-disable-next-line no-console
      console.error(
        "[engine] ENCRYPTION_KEY is not configured but the org has a stored LLM key; falling back to the env-based key for this run.",
      );
      return null;
    }
    throw err;
  }
}

/**
 * Run the golden Q&A suite against a project. Returns a summary of the run
 * after persisting all rows. Safe to call from API routes and from cron —
 * it always uses the admin client (bypasses RLS) because the engine
 * legitimately needs to write runs on behalf of the user.
 *
 * The run is `await`ed end-to-end (no fire-and-forget) so the API caller
 * gets the summary back. If the run is very long, callers should consider
 * running it via a job queue, but for v1 we keep it inline.
 *
 * BYOK: the org's stored LLM key is resolved (decrypted) once at the
 * start of the run and reused for every question. If the org has none,
 * we fall back to the env-based provider.
 */
export async function runProject(
  projectId: Uuid,
  triggeredBy: TriggerSource,
): Promise<RunSummary> {
  const supabase = createAdminClient();

  // 1. Load project.
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (projErr || !project) {
    throw new Error(`Project not found: ${projectId} (${projErr?.message ?? "no row"})`);
  }
  if (!project.rag_endpoint_url) {
    throw new Error(`Project ${projectId} has no rag_endpoint_url configured`);
  }

  // 2. Resolve BYOK once (or fall back to env). The env-based provider
  //    is constructed lazily by getLLM() inside judgeAnswer when no BYOK
  //    key is present.
  const orgId = (project as { org_id: string }).org_id;
  const byokKey = await resolveOrgLlmApiKey(supabase, orgId);

  const judgeOpts: {
    apiKey?: string | null;
    provider?: string | null;
  } = byokKey
    ? {
        apiKey: byokKey,
        provider:
          (project as { judge_provider?: string | null }).judge_provider ?? null,
      }
    : {};
  if (!byokKey) {
    // Sanity check the env-based fallback is wired up. We only call this
    // once at the start so missing keys fail fast with a clean error
    // before we burn questions.
    try {
      getLLM();
    } catch (err) {
      throw new Error(
        `No LLM key configured for this organization and the env fallback is missing. ${
          err instanceof Error ? err.message : "Add an API key in Settings → LLM key or set DEEPSEEK_API_KEY in the env."
        }`,
      );
    }
  }

  // 2. Load active golden Q&As.
  const { data: golden, error: goldErr } = await supabase
    .from("golden_qa")
    .select("*")
    .eq("project_id", projectId)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (goldErr) {
    throw new Error(`Failed to load golden Q&As: ${goldErr.message}`);
  }
  const goldenList = golden ?? [];

  // 3. Insert the run row up-front so we have an id to attach results to.
  const { data: runRow, error: runErr } = await supabase
    .from("runs")
    .insert({
      project_id: projectId,
      status: "running",
      total: goldenList.length,
      passed: 0,
      failed: 0,
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();
  if (runErr || !runRow) {
    throw new Error(`Failed to create run row: ${runErr?.message ?? "no row"}`);
  }
  const runId: Uuid = runRow.id;

  // 4. Run each golden Q.
  let passedCount = 0;
  let failedCount = 0;
  const failedQuestionIds: Uuid[] = [];
  const resultRows: Array<Record<string, unknown>> = [];

  for (const q of goldenList) {
    let actualAnswer: string | null = null;
    let latencyMs: number | null = null;
    let score: number | null = null;
    let reasoning: string | null = null;
    let passed: boolean | null = null;

    try {
      const call = await callRagEndpoint({
        url: project.rag_endpoint_url,
        secret: project.rag_endpoint_secret,
        question: q.question,
      });
      actualAnswer = call.answer;
      latencyMs = call.latencyMs;

      const judge = await judgeAnswer(
        {
          question: q.question,
          expectedAnswer: q.expected_answer,
          actualAnswer: call.answer,
          rubric: q.judge_rubric,
        },
        judgeOpts,
      );
      score = judge.score;
      reasoning = judge.reasoning;
      passed = judge.score >= Number(project.pass_threshold ?? 0.7);
      if (passed) passedCount += 1;
      else failedCount += 1;
    } catch (err) {
      const msg =
        err instanceof RagClientError
          ? `[RAG] ${err.message}`
          : err instanceof Error
            ? `[err] ${err.message}`
            : "[err] unknown error";
      reasoning = msg;
      passed = false;
      failedCount += 1;
    }

    if (passed === false) failedQuestionIds.push(q.id);

    resultRows.push({
      run_id: runId,
      golden_qa_id: q.id,
      question: q.question,
      expected_answer: q.expected_answer,
      actual_answer: actualAnswer,
      judge_score: score,
      judge_reasoning: reasoning,
      passed,
      latency_ms: latencyMs,
      review_status: "pending",
    });
  }

  // 5. Insert all results in one batch.
  if (resultRows.length > 0) {
    const { error: resultsErr } = await supabase
      .from("run_results")
      .insert(resultRows);
    if (resultsErr) {
      await markRunFailed(supabase, runId, `Failed to insert results: ${resultsErr.message}`);
      return {
        runId,
        projectId,
        total: goldenList.length,
        passed: passedCount,
        failed: failedCount,
        status: "failed",
        triggeredBy,
        failedQuestionIds,
        error: resultsErr.message,
      };
    }
  }

  // 6. Mark run completed.
  const { error: finishErr } = await supabase
    .from("runs")
    .update({
      status: failedCount === goldenList.length && goldenList.length > 0 ? "failed" : "completed",
      finished_at: new Date().toISOString(),
      total: goldenList.length,
      passed: passedCount,
      failed: failedCount,
    })
    .eq("id", runId);
  if (finishErr) {
    await markRunFailed(supabase, runId, `Failed to finish run: ${finishErr.message}`);
    return {
      runId,
      projectId,
      total: goldenList.length,
      passed: passedCount,
      failed: failedCount,
      status: "failed",
      triggeredBy,
      failedQuestionIds,
      error: finishErr.message,
    };
  }

  // 7. Best-effort email alert.
  if (failedCount > 0) {
    try {
      await sendAlertEmail({
        projectId,
        runId,
        total: goldenList.length,
        passed: passedCount,
        failed: failedCount,
      });
    } catch (err) {
      // Don't fail the run on email problems; just log.
      // eslint-disable-next-line no-console
      console.warn(
        `[engine] failed to send alert email for run ${runId}:`,
        err,
      );
    }
  }

  return {
    runId,
    projectId,
    total: goldenList.length,
    passed: passedCount,
    failed: failedCount,
    status: failedCount === goldenList.length && goldenList.length > 0 ? "failed" : "completed",
    triggeredBy,
    failedQuestionIds,
  };
}

async function markRunFailed(
  supabase: ReturnType<typeof createAdminClient>,
  runId: Uuid,
  error: string,
): Promise<void> {
  await supabase
    .from("runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error,
    })
    .eq("id", runId);
}

async function sendAlertEmail(input: {
  projectId: Uuid;
  runId: Uuid;
  total: number;
  passed: number;
  failed: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!apiKey || !from) {
    // No email config — silently skip; the run still succeeded.
    return;
  }
  // Look up org owner email(s) via admin client.
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("org_id, name")
    .eq("id", input.projectId)
    .single();
  if (!project) return;

  const { data: members } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", project.org_id);
  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return;

  // We don't have direct access to auth.users emails via the standard
  // client, but the admin client can list them with the service role.
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }
  const recipients = userIds
    .map((id) => emailById.get(id))
    .filter((e): e is string => Boolean(e));
  if (recipients.length === 0) return;

  const resend = new Resend(apiKey);
  const subject = `[RAG Drift] ${input.failed}/${input.total} failed on ${project.name}`;
  const html = `
    <p>Drift detected on project <strong>${escapeHtml(project.name)}</strong>.</p>
    <p>Run: ${input.runId}<br/>
       Passed: ${input.passed}/${input.total}<br/>
       Failed: ${input.failed}/${input.total}</p>
    <p><a href="${appUrl}/projects/${input.projectId}/runs/${input.runId}">View run</a></p>
  `;
  await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
