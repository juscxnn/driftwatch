import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Button } from './button';

describe('Button', () => {
  it('renders the label text', () => {
    const html = renderToString(<Button>Click me</Button>);
    expect(html).toContain('Click me');
  });

  it('uses btn-primary by default', () => {
    const html = renderToString(<Button>Save</Button>);
    expect(html).toContain('btn-primary');
  });

  it('applies the requested variant class', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
    for (const variant of variants) {
      const html = renderToString(<Button variant={variant}>X</Button>);
      expect(html).toContain(`btn-${variant}`);
    }
  });

  it('applies the requested size class (md default)', () => {
    const html = renderToString(<Button>Save</Button>);
    expect(html).toContain('h-9');
    expect(html).toContain('px-3.5');
  });

  it('applies sm size classes', () => {
    const html = renderToString(<Button size="sm">Save</Button>);
    expect(html).toContain('h-8');
    expect(html).toContain('px-2.5');
    expect(html).toContain('text-xs');
  });

  it('applies lg size classes', () => {
    const html = renderToString(<Button size="lg">Save</Button>);
    expect(html).toContain('h-10');
    expect(html).toContain('px-4');
    expect(html).toContain('text-base');
  });

  it('disables the button when loading', () => {
    const html = renderToString(<Button loading>Save</Button>);
    expect(html).toContain('disabled');
  });

  it('renders an aria-busy attribute while loading', () => {
    const html = renderToString(<Button loading>Save</Button>);
    expect(html).toContain('aria-busy="true"');
  });

  it('renders an icon when provided', () => {
    const html = renderToString(
      <Button icon={<span data-testid="plus">+</span>}>Add</Button>,
    );
    expect(html).toContain('data-testid="plus"');
  });

  it('forwards extra className and merges', () => {
    const html = renderToString(<Button className="mt-4">Save</Button>);
    expect(html).toContain('btn-primary');
    expect(html).toContain('mt-4');
  });

  it('renders type=button by default (not submit)', () => {
    const html = renderToString(<Button>Save</Button>);
    expect(html).toContain('type="button"');
  });
});
