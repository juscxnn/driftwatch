import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  InboxIllustration,
  ProjectsIllustration,
  GoldenIllustration,
  SourcesIllustration,
  RunsIllustration,
  TriageIllustration,
  ILLUSTRATIONS,
  ILLUSTRATION_KEYS,
} from './empty-state-illustrations';

describe('EmptyStateIllustrations', () => {
  const cases: Array<[string, (props?: { className?: string }) => JSX.Element]> = [
    ['InboxIllustration', InboxIllustration],
    ['ProjectsIllustration', ProjectsIllustration],
    ['GoldenIllustration', GoldenIllustration],
    ['SourcesIllustration', SourcesIllustration],
    ['RunsIllustration', RunsIllustration],
    ['TriageIllustration', TriageIllustration],
  ];

  it.each(cases)('%s renders an svg without throwing', (_name, render) => {
    const html = renderToString(render());
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it('every named key has a registered illustration', () => {
    for (const key of ILLUSTRATION_KEYS) {
      expect(ILLUSTRATIONS[key]).toBeTypeOf('function');
    }
  });

  it('applies the provided className', () => {
    const html = renderToString(<InboxIllustration className="h-24 w-24 text-brand" />);
    expect(html).toContain('h-24');
    expect(html).toContain('w-24');
    expect(html).toContain('text-brand');
  });
});