import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ShortcutsHelpDialog } from './shortcuts-help-dialog';

describe('ShortcutsHelpDialog', () => {
  it('renders nothing when closed (matches Dialog contract)', () => {
    const html = renderToString(
      <ShortcutsHelpDialog open={false} onClose={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('renders the title and key list when open', () => {
    const html = renderToString(
      <ShortcutsHelpDialog open onClose={() => {}} />,
    );
    expect(html).toContain('Keyboard shortcuts');
    expect(html).toContain('Move selection down');
    expect(html).toContain('Move selection up');
    expect(html).toContain('Approve selected');
    expect(html).toContain('Reword Q on selected');
    expect(html).toContain('Escalate selected');
  });

  it('renders key cap elements with <kbd>', () => {
    const html = renderToString(
      <ShortcutsHelpDialog open onClose={() => {}} />,
    );
    expect(html).toContain('<kbd');
    expect(html).toContain('</kbd>');
  });
});