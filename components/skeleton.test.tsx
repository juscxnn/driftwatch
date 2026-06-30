import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Skeleton, SkeletonText } from './skeleton';

describe('Skeleton', () => {
  it('renders with the base pulse classes', () => {
    const html = renderToString(<Skeleton />);
    expect(html).toContain('animate-pulse');
    expect(html).toContain('rounded-md');
    expect(html).toContain('bg-surface-muted');
  });

  it('honors a custom className', () => {
    const html = renderToString(<Skeleton className="h-4 w-24" />);
    expect(html).toContain('h-4');
    expect(html).toContain('w-24');
  });

  it('is marked aria-hidden for accessibility', () => {
    const html = renderToString(<Skeleton />);
    expect(html).toContain('aria-hidden');
  });
});

describe('SkeletonText', () => {
  it('renders the requested number of lines', () => {
    const html = renderToString(<SkeletonText lines={5} />);
    const matches = html.match(/animate-pulse/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it('defaults to 3 lines', () => {
    const html = renderToString(<SkeletonText />);
    const matches = html.match(/animate-pulse/g) ?? [];
    expect(matches.length).toBe(3);
  });

  it('applies a custom last-line width', () => {
    const html = renderToString(<SkeletonText lines={2} lastLineWidth="40%" />);
    expect(html).toContain('width:40%');
    expect(html.toLowerCase()).toContain('width:40%');
  });
});
