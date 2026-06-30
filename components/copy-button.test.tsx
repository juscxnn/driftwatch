import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  it('renders with default classes and accessible label', () => {
    const html = renderToString(<CopyButton text="hello world" />);
    expect(html).toContain('btn-ghost');
    expect(html).toContain('aria-label="Copy"');
    expect(html).toContain('<svg');
  });

  it('honours a custom accessible label', () => {
    const html = renderToString(
      <CopyButton text="abc" label="Copy token" />,
    );
    expect(html).toContain('aria-label="Copy token"');
    expect(html).toContain('title="Copy token"');
  });

  it('forwards extra className', () => {
    const html = renderToString(
      <CopyButton text="abc" className="ml-2 custom-extra" />,
    );
    expect(html).toContain('ml-2');
    expect(html).toContain('custom-extra');
  });

  it('renders nothing when text is empty', () => {
    const html = renderToString(<CopyButton text="" />);
    expect(html).toBe('');
  });

  it('initial render shows the copy icon, not the check icon', () => {
    const html = renderToString(<CopyButton text="abc" />);
    expect(html).toContain('<rect');
    expect(html).not.toContain('M5 12 L10 17 L19 7');
  });
});