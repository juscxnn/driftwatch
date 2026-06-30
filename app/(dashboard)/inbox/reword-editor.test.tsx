import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { RewordEditor } from './reword-editor';

describe('RewordEditor', () => {
  it('renders with prefilled fields and labels', () => {
    const html = renderToString(
      <RewordEditor
        runResultId="rr-1"
        goldenQaId="g-1"
        initialQuestion="What is your refund policy?"
        initialExpectedAnswer="30 days, full refund."
        onSaved={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('What is your refund policy?');
    expect(html).toContain('30 days, full refund.');
    expect(html).toContain('Save &amp; mark reworded');
    expect(html).toContain('Cancel');
    expect(html).toContain('Question');
    expect(html).toContain('Expected answer');
  });

  it('pre-fills the textareas with the supplied initial values', () => {
    const html = renderToString(
      <RewordEditor
        runResultId="rr-1"
        goldenQaId="g-1"
        initialQuestion="Initial Q"
        initialExpectedAnswer="Initial A"
        onSaved={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toMatch(/Initial Q/);
    expect(html).toMatch(/Initial A/);
    expect(html).toContain('<textarea');
  });
});