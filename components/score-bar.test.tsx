import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScoreBar } from './score-bar';

describe('ScoreBar', () => {
  it('renders the score formatted to 2 decimals', () => {
    const html = renderToString(<ScoreBar score={0.85} />);
    expect(html).toContain('0.85');
  });

  it('renders a non-passing score still formatted to 2 decimals', () => {
    const html = renderToString(<ScoreBar score={0.42} />);
    expect(html).toContain('0.42');
  });

  it('renders an em-dash when score is null', () => {
    const html = renderToString(<ScoreBar score={null} />);
    expect(html).toContain('—');
    expect(html).not.toContain('0.85');
  });

  it('renders an em-dash when score is undefined', () => {
    const html = renderToString(<ScoreBar score={undefined} />);
    expect(html).toContain('—');
  });
});