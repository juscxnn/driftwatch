/**
 * /api/sample-rag — a fake RAG endpoint that ships with the app.
 *
 * Purpose: gives new users a working RAG to point the drift detector at
 * the moment they sign up, so the empty inbox is replaced with a live
 * "watched" project in under 30 seconds. The answers are intentionally
 * imperfect (some wrong, some vague) so the judge has something to flag.
 *
 * Contract: POST { question: string } → { answer: string }.
 *  - 100–400ms artificial latency.
 *  - ~10% flakiness on the "correct" answers to demo drift detection.
 *  - No-store so the engine never gets a cached hit.
 *
 * No auth — this is a public demo endpoint, not a customer resource.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface KnowledgeBaseEntry {
  /** A few normalized variants of the question we should match against. */
  match: string[];
  /** The "correct" answer the sample RAG usually returns. */
  answer: string;
  /**
   * If true, ~10% of the time we will deliberately return a wrong answer
   * (picked at random from the same knowledge base) to demonstrate drift.
   */
  flaky?: boolean;
}

const KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    match: ["what is your refund policy?", "refund policy", "refunds?"],
    answer: "All sales are final. We do not offer refunds.",
  },
  {
    match: ["how do i reset my password?", "reset password", "forgot password"],
    answer: "Please contact support.",
    flaky: true,
  },
  {
    match: ["what are your support hours?", "support hours"],
    answer: "We are available 24/7.",
  },
  {
    match: ["how much does pro cost?", "pro cost", "pro pricing"],
    answer: "$99/month.",
  },
  {
    match: ["do you offer annual billing?", "annual billing"],
    answer: "Yes, save 10%.",
    flaky: true,
  },
  {
    match: ["what integrations do you support?", "integrations"],
    answer: "We integrate with everything.",
  },
  {
    match: ["how do i cancel my subscription?", "cancel subscription"],
    answer: "Email billing@example.com.",
  },
  {
    match: ["is my data secure?", "data security"],
    answer: "Yes, we use industry-standard encryption.",
    flaky: true,
  },
];

const FALLBACK_ANSWER =
  "I do not have information about that. Please contact support.";

const FLAKY_PROBABILITY = 0.1;
const MIN_LATENCY_MS = 100;
const MAX_LATENCY_MS = 400;

function findEntry(normalized: string): KnowledgeBaseEntry | null {
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.match.some((m) => normalized === m)) return entry;
  }
  return null;
}

function pickRandomWrongAnswer(): string {
  const pool = KNOWLEDGE_BASE.map((e) => e.answer);
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomLatencyMs(): number {
  return (
    Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1)) +
    MIN_LATENCY_MS
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const question =
    body && typeof body === "object" && "question" in body
      ? String((body as { question: unknown }).question ?? "").trim()
      : "";
  if (!question) {
    return NextResponse.json(
      { error: "Missing 'question' field" },
      { status: 400 },
    );
  }

  const normalized = question.toLowerCase().trim();
  const entry = findEntry(normalized);

  let answer: string;
  if (entry) {
    if (entry.flaky && Math.random() < FLAKY_PROBABILITY) {
      answer = pickRandomWrongAnswer();
    } else {
      answer = entry.answer;
    }
  } else {
    answer = FALLBACK_ANSWER;
  }

  await new Promise((resolve) => setTimeout(resolve, randomLatencyMs()));

  return NextResponse.json(
    { answer },
    { headers: { "Cache-Control": "no-store" } },
  );
}
