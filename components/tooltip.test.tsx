import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Tooltip } from './tooltip';

// Full hover/focus behavior needs DOM. Here we verify the static markup:
// the trigger child receives the label as a `title` attribute so non-JS
// users still see a native tooltip.

describe('Tooltip', () => {
  it('passes the label to the child as a title attribute', () => {
    const html = renderToString(
      <Tooltip label="Approve">
        <button>✓</button>
      </Tooltip>,
    );
    expect(html).toContain('title="Approve"');
  });

  it('does not crash without hover behavior', () => {
    expect(() =>
      renderToString(
        <Tooltip label="Help" position="bottom">
          <span>?</span>
        </Tooltip>,
      ),
    ).not.toThrow();
  });

  it('renders the trigger child element', () => {
    const html = renderToString(
      <Tooltip label="Approve">
        <button data-testid="approve">✓</button>
      </Tooltip>,
    );
    expect(html).toContain('data-testid="approve"');
    expect(html).toContain('<button');
  });
});
