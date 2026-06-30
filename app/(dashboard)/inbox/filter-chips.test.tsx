import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FilterChips } from './filter-chips';

describe('FilterChips', () => {
  const projects = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ];

  it('renders without crashing', () => {
    expect(() =>
      renderToString(
        <FilterChips
          score="all"
          onScoreChange={() => {}}
          projectId={null}
          onProjectChange={() => {}}
          projects={projects}
          onClear={() => {}}
        />,
      ),
    ).not.toThrow();
  });

  it('marks the active chip with bg-brand text-bg', () => {
    const html = renderToString(
      <FilterChips
        score="low"
        onScoreChange={() => {}}
        projectId={null}
        onProjectChange={() => {}}
        projects={projects}
        onClear={() => {}}
      />,
    );
    expect(html).toContain('bg-brand');
    expect(html).toContain('text-bg');
    expect(html).toContain('aria-selected="true"');
  });

  it('hides the project select when only one project exists', () => {
    const html = renderToString(
      <FilterChips
        score="all"
        onScoreChange={() => {}}
        projectId={null}
        onProjectChange={() => {}}
        projects={[{ id: 'only', name: 'Solo' }]}
        onClear={() => {}}
      />,
    );
    expect(html).not.toContain('inbox-project-filter');
  });

  it('shows the project select when multiple projects exist', () => {
    const html = renderToString(
      <FilterChips
        score="all"
        onScoreChange={() => {}}
        projectId={null}
        onProjectChange={() => {}}
        projects={projects}
        onClear={() => {}}
      />,
    );
    expect(html).toContain('inbox-project-filter');
    expect(html).toContain('Alpha');
    expect(html).toContain('Beta');
  });

  it('does not show clear-filter when nothing is active', () => {
    const html = renderToString(
      <FilterChips
        score="all"
        onScoreChange={() => {}}
        projectId={null}
        onProjectChange={() => {}}
        projects={projects}
        onClear={() => {}}
      />,
    );
    expect(html).not.toContain('Clear filter');
  });

  it('shows clear-filter when a non-default filter is active', () => {
    const html = renderToString(
      <FilterChips
        score="low"
        onScoreChange={() => {}}
        projectId={null}
        onProjectChange={() => {}}
        projects={projects}
        onClear={() => {}}
      />,
    );
    expect(html).toContain('Clear filter');
  });
});