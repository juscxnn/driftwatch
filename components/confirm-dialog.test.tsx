import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ConfirmDialog } from './confirm-dialog';

// Click/keyboard behavior is not exercised here — the test environment is
// node, not jsdom. We assert on the static markup: which variant the
// confirm button uses, whether the type-to-confirm input is rendered,
// and that the confirm button is initially disabled until typed input
// matches `requireTextMatch`.

describe('ConfirmDialog', () => {
  it('uses btn-primary by default', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Are you sure?"
        confirmLabel="Save"
      />,
    );
    expect(html).toContain('btn-primary');
    expect(html).not.toContain('btn-danger');
    expect(html).toContain('Save');
  });

  it('uses btn-danger for the danger variant', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        confirmLabel="Delete"
        variant="danger"
      />,
    );
    expect(html).toContain('btn-danger');
    expect(html).not.toContain('btn-primary');
    expect(html).toContain('Delete');
  });

  it('applies text-danger to the title for the danger variant', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        variant="danger"
      />,
    );
    expect(html).toContain('text-danger');
  });

  it('renders the cancel label', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="x"
        cancelLabel="Nevermind"
      />,
    );
    expect(html).toContain('Nevermind');
    expect(html).toContain('btn-ghost');
  });

  it('renders the type-to-confirm input when requireTextMatch is set', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        variant="danger"
        requireTextMatch="my-org"
        requireTextLabel="Type the name to confirm:"
      />,
    );
    expect(html).toContain('confirm-input');
    expect(html).toContain('Type the name to confirm:');
  });

  it('disables the confirm button when type-to-confirm does not yet match', () => {
    const html = renderToString(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        variant="danger"
        confirmLabel="Delete"
        requireTextMatch="my-org"
      />,
    );
    // confirm-input is initially empty so confirm must be disabled
    expect(html).toContain('disabled');
  });
});
