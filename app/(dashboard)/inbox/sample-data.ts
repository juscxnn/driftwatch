'use server';

/**
 * seedSampleDataAction — creates (or reuses) a pre-wired "Acme Support
 * (sample)" project for the current org, seeds it with 8 golden Q&As,
 * and triggers a manual run so the new user lands on a populated inbox
 * within a few seconds.
 *
 * Idempotent: if the project already exists for this org we just trigger
 * a fresh run; if the golden Q&As already exist we leave them alone.
 */

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { runProject } from '@/lib/rag/engine';
import { createAdminClient } from '@/lib/supabase/admin';

export type SeedSampleDataResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

const SAMPLE_PROJECT_NAME = 'Acme Support (sample)';
const SAMPLE_ENDPOINT_PATH = '/api/sample-rag';

interface SampleQa {
  question: string;
  expected_answer: string;
  judge_rubric?: string;
}

const SAMPLE_QA: readonly SampleQa[] = [
  {
    question: 'What is your refund policy?',
    expected_answer: '30 days, full refund.',
    judge_rubric:
      'Should mention a 30-day window and that a full refund is available.',
  },
  {
    question: 'How do I reset my password?',
    expected_answer:
      "Click 'Forgot password' on the login page and follow the email link.",
  },
  {
    question: 'What are your support hours?',
    expected_answer: 'We are available 24/7.',
  },
  {
    question: 'How much does Pro cost?',
    expected_answer: '$99/month.',
  },
  {
    question: 'Do you offer annual billing?',
    expected_answer:
      'Yes — annual plans are available and save 20% compared to monthly billing.',
  },
  {
    question: 'What integrations do you support?',
    expected_answer:
      'Slack, Notion, Linear, GitHub, Google Drive, Salesforce, and Zapier.',
  },
  {
    question: 'How do I cancel my subscription?',
    expected_answer: 'Email billing@example.com.',
  },
  {
    question: 'Is my data secure?',
    expected_answer:
      'Yes — data is encrypted at rest with AES-256 and in transit with TLS 1.3, and we are SOC 2 Type II certified.',
  },
];

function buildSampleEndpointUrl(): string {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/+$/, '')}${SAMPLE_ENDPOINT_PATH}`;
}

export async function seedSampleDataAction(): Promise<SeedSampleDataResult> {
  try {
    const session = await getSession();
    const supabase = createAdminClient();

    // 1. Find or create the sample project for this org.
    const { data: existing, error: findErr } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', session.orgId)
      .eq('name', SAMPLE_PROJECT_NAME)
      .maybeSingle();
    if (findErr) {
      return { ok: false, error: findErr.message };
    }

    let projectId: string;
    if (existing) {
      projectId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('projects')
        .insert({
          org_id: session.orgId,
          name: SAMPLE_PROJECT_NAME,
          rag_endpoint_url: buildSampleEndpointUrl(),
          rag_endpoint_secret: null,
        })
        .select('id')
        .single();
      if (createErr || !created) {
        return {
          ok: false,
          error: createErr?.message ?? 'Failed to create sample project.',
        };
      }
      projectId = created.id;

      // 2. Seed the golden Q&As (one-time).
      const rows = SAMPLE_QA.map((q) => ({
        project_id: projectId,
        question: q.question,
        expected_answer: q.expected_answer,
        judge_rubric: q.judge_rubric ?? null,
        tags: ['sample'],
        active: true,
      }));
      const { error: goldErr } = await supabase
        .from('golden_qa')
        .insert(rows);
      if (goldErr) {
        return { ok: false, error: goldErr.message };
      }
    }

    // 3. Trigger a manual run so the inbox lights up immediately.
    try {
      await runProject(projectId, 'manual');
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? `Sample project created but the run failed: ${err.message}`
            : 'Sample project created but the run failed.',
      };
    }

    revalidatePath('/');
    return { ok: true, projectId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error.',
    };
  }
}
