import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Field } from './field';

describe('Field', () => {
  it('renders the label text', () => {
    const html = renderToString(
      <Field label="Email">
        <input className="input" />
      </Field>,
    );
    expect(html).toContain('Email');
    expect(html).toContain('<label');
  });

  it('renders helper text when provided', () => {
    const html = renderToString(
      <Field label="Email" helper="We never share your email.">
        <input className="input" />
      </Field>,
    );
    expect(html).toContain('We never share your email.');
  });

  it('renders error message instead of helper when error is set', () => {
    const html = renderToString(
      <Field label="Email" helper="Helper" error="Required">
        <input className="input" />
      </Field>,
    );
    expect(html).toContain('Required');
    expect(html).toContain('error-text');
    expect(html).not.toContain('Helper');
  });

  it('wires htmlFor to the label and the children it wraps', () => {
    const html = renderToString(
      <Field label="Email" htmlFor="email">
        <input id="email" className="input" />
      </Field>,
    );
    expect(html).toMatch(/<label[^>]*for="email"/);
    expect(html).toContain('id="email"');
  });
});
