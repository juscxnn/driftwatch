import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Dialog } from './dialog';

describe('Dialog', () => {
  it('renders without crashing', () => {
    expect(() =>
      renderToString(
        <Dialog open onClose={() => {}} title="Hello">
          <p>Body</p>
        </Dialog>,
      ),
    ).not.toThrow();
  });

  it('renders nothing while closed (no portal during SSR)', () => {
    const html = renderToString(
      <Dialog open={false} onClose={() => {}} title="Hello">
        <p>Body</p>
      </Dialog>,
    );
    // Dialog gates the portal on a post-mount effect so SSR doesn't try
    // to touch document.body. The visible output is empty.
    expect(html).toBe('');
  });

  it('passes through size variants without crashing', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      expect(() =>
        renderToString(
          <Dialog open onClose={() => {}} size={size} title={`size-${size}`}>
            <p>x</p>
          </Dialog>,
        ),
      ).not.toThrow();
    }
  });

  it('renders a footer slot without crashing', () => {
    expect(() =>
      renderToString(
        <Dialog
          open
          onClose={() => {}}
          title="With footer"
          footer={<button>OK</button>}
        >
          <p>Body</p>
        </Dialog>,
      ),
    ).not.toThrow();
  });

  it('renders a titleClassName override without crashing', () => {
    expect(() =>
      renderToString(
        <Dialog open onClose={() => {}} title="Destructive" titleClassName="text-danger">
          <p>Body</p>
        </Dialog>,
      ),
    ).not.toThrow();
  });
});
