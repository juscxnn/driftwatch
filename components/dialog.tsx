'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type DialogSize = 'sm' | 'md' | 'lg';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  /** When true, clicking the backdrop closes the dialog. ESC always closes.
   * Default is false because the modal is typically used for destructive
   * confirmations. */
  dismissible?: boolean;
  /** Extra classes applied to the title element. Used by ConfirmDialog to
   * color destructive titles red. */
  titleClassName?: string;
};

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

type SurfaceProps = {
  titleId: string;
  descriptionId: string;
  labelledBy?: string;
  describedBy?: string;
  title?: string;
  description?: string;
  titleClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  size: DialogSize;
  panelRef: React.Ref<HTMLDivElement>;
  showBackdrop: boolean;
  onBackdropMouseDown: (ev: React.MouseEvent<HTMLDivElement>) => void;
};

function DialogSurface({
  titleId,
  descriptionId,
  labelledBy,
  describedBy,
  title,
  description,
  titleClassName,
  children,
  footer,
  size,
  panelRef,
  showBackdrop,
  onBackdropMouseDown,
}: SurfaceProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onMouseDown={onBackdropMouseDown}
    >
      {showBackdrop ? (
        <div aria-hidden className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
      ) : null}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative w-full ${SIZE_CLASS[size]} rounded-md border border-border bg-surface text-text shadow-elevated outline-none`}
      >
        {title || description ? (
          <div className="border-b border-border p-5">
            {title ? (
              <h2
                id={titleId}
                className={`text-base font-medium tracking-tight ${titleClassName ?? ''}`.trim()}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descriptionId} className="mt-1.5 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="p-6">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = false,
  titleClassName,
}: DialogProps) {
  // `mounted` flips to true after the first client-side render. While
  // false we render the markup in place (also used for SSR / renderToString
  // tests). After mount we use a portal to document.body so the dialog
  // escapes any overflow:hidden ancestor and we can rely on body-scroll
  // lock to suppress the page underneath.
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusables = root
      ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    const target = focusables[0] ?? root;
    const t = window.setTimeout(() => target?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (ev.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('aria-hidden'));
      if (focusables.length === 0) {
        ev.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (ev.shiftKey) {
        if (active === first || !root.contains(active)) {
          ev.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        ev.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mounted]);

  const labelledBy = useMemo(() => (title ? titleId : undefined), [title, titleId]);
  const describedBy = useMemo(
    () => (description ? descriptionId : undefined),
    [description, descriptionId],
  );

  if (!open) return null;

  function onBackdropMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.target === ev.currentTarget && dismissible) {
      onCloseRef.current();
    }
  }

  const surface = (
    <DialogSurface
      titleId={titleId}
      descriptionId={descriptionId}
      labelledBy={labelledBy}
      describedBy={describedBy}
      title={title}
      description={description}
      titleClassName={titleClassName}
      size={size}
      panelRef={dialogRef}
      showBackdrop={mounted}
      onBackdropMouseDown={onBackdropMouseDown}
      footer={footer}
    >
      {children}
    </DialogSurface>
  );

  // While waiting for the first effect to flip `mounted`, render the
  // surface in place. This keeps hydration predictable (no document.body
  // access on the server) and lets SSR / static rendering produce
  // inspectable markup for tests.
  if (!mounted) return surface;

  return createPortal(surface, document.body);
}
