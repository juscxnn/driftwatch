import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DriftRow } from './drift-row';
import type { InboxDrift } from '@/lib/types';

const baseDrift: InboxDrift = {
  run_result_id: 'rr-1',
  run_id: 'r-1',
  run_started_at: new Date().toISOString(),
  project_id: 'p-1',
  project_name: 'Sample project',
  golden_qa_id: 'g-1',
  question: 'What is your refund policy?',
  expected_answer: '30 days, full refund.',
  actual_answer: '14 days, partial refund.',
  judge_score: 0.42,
  judge_reasoning: 'Wrong window length.',
  latency_ms: 320,
  review_status: 'pending',
  created_at: new Date().toISOString(),
};

describe('DriftRow', () => {
  it('renders the question, expected answer, and judge reasoning', () => {
    const html = renderToString(<DriftRow drift={baseDrift} />);
    expect(html).toContain('What is your refund policy?');
    expect(html).toContain('30 days, full refund.');
    expect(html).toContain('14 days, partial refund.');
    expect(html).toContain('Wrong window length.');
    expect(html).toContain('Sample project');
  });

  it('renders the three triage actions', () => {
    const html = renderToString(<DriftRow drift={baseDrift} />);
    expect(html).toContain('Approve');
    expect(html).toContain('Reword Q');
    expect(html).toContain('Escalate');
  });

  it('applies a brand ring when selected', () => {
    const html = renderToString(<DriftRow drift={baseDrift} selected />);
    expect(html).toContain('border-brand');
    expect(html).toContain('ring-1');
  });

  it('does not apply the selected ring by default', () => {
    const html = renderToString(<DriftRow drift={baseDrift} />);
    expect(html).not.toContain('ring-1');
  });

  it('handles a null judge score gracefully', () => {
    const html = renderToString(
      <DriftRow
        drift={{ ...baseDrift, judge_score: null, judge_reasoning: null }}
      />,
    );
    expect(html).toContain('—');
    expect(html).not.toContain('Wrong window length.');
  });
});