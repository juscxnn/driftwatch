import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { InboxList } from './inbox-list';
import type { InboxDrift } from '@/lib/types';

const drift: InboxDrift = {
  run_result_id: 'rr-1',
  run_id: 'r-1',
  run_started_at: new Date().toISOString(),
  project_id: 'p-1',
  project_name: 'Sample',
  golden_qa_id: 'g-1',
  question: 'What is your refund policy?',
  expected_answer: '30 days.',
  actual_answer: '14 days.',
  judge_score: 0.42,
  judge_reasoning: 'Wrong window.',
  latency_ms: 100,
  review_status: 'pending',
  created_at: new Date().toISOString(),
};

describe('InboxList', () => {
  it('renders the filter chips above the drift list', () => {
    const html = renderToString(
      <InboxList
        initialDrifts={[drift]}
        totalPending={1}
        projects={[{ id: 'p-1', name: 'Sample' }]}
      />,
    );
    expect(html).toContain('All');
    expect(html).toContain('Drifted &lt;0.5');
    expect(html).toContain('Drifted 0.5–0.7');
    expect(html).toContain('Sample');
  });

  it('renders the load-more button when there are more drifts', () => {
    const html = renderToString(
      <InboxList
        initialDrifts={[drift]}
        totalPending={100}
        projects={[{ id: 'p-1', name: 'Sample' }]}
      />,
    );
    expect(html).toContain('Load more');
  });

  it('omits load-more when all drifts are loaded', () => {
    const html = renderToString(
      <InboxList
        initialDrifts={[drift]}
        totalPending={1}
        projects={[{ id: 'p-1', name: 'Sample' }]}
      />,
    );
    expect(html).not.toContain('Load more');
  });

  it('renders the by-project select when multiple projects exist', () => {
    const html = renderToString(
      <InboxList
        initialDrifts={[
          { ...drift, project_id: 'p-1', project_name: 'Alpha' },
          { ...drift, run_result_id: 'rr-2', project_id: 'p-2', project_name: 'Beta' },
        ]}
        totalPending={2}
        projects={[
          { id: 'p-1', name: 'Alpha' },
          { id: 'p-2', name: 'Beta' },
        ]}
      />,
    );
    expect(html).toContain('inbox-project-filter');
    expect(html).toContain('All projects');
  });

  it('renders nothing extra when there are no drifts', () => {
    const html = renderToString(
      <InboxList
        initialDrifts={[]}
        totalPending={0}
        projects={[{ id: 'p-1', name: 'Sample' }]}
      />,
    );
    expect(html).not.toContain('Load more');
    expect(html).not.toContain('Approve');
  });
});