'use client';

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  label: string;
  position?: TooltipPosition;
  /** Delay before showing on hover/focus, in ms. */
  delayMs?: number;
  /** Delay before hiding on mouseleave/blur, in ms. */
  hideDelayMs?: number;
  /** Element to attach the tooltip to. Must be a single React element
   * that forwards refs. */
  children: ReactElement;
};

const SHOW_DELAY_DEFAULT = 200;
const HIDE_DELAY_DEFAULT = 100;

const OFFSET = 8;
const ARROW = 6;

const POSITION_STYLE: Record<TooltipPosition, React.CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: OFFSET },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: OFFSET },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: OFFSET },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: OFFSET },
};

function arrowStyle(position: TooltipPosition): React.CSSProperties {
  // Arrows live on the tooltip's `::after`. We can't write inline ::after
  // styles, so we use absolute positioning of a child element instead.
  switch (position) {
    case 'top':
      return { bottom: -ARROW, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
    case 'bottom':
      return { top: -ARROW, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
    case 'left':
      return { right: -ARROW, top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
    case 'right':
      return { left: -ARROW, top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
  }
}

export function Tooltip({
  label,
  position = 'top',
  delayMs = SHOW_DELAY_DEFAULT,
  hideDelayMs = HIDE_DELAY_DEFAULT,
  children,
}: TooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  function clearTimers() {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function show() {
    clearTimers();
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let top = 0;
      let left = 0;
      if (position === 'top') {
        top = rect.top + window.scrollY;
        left = rect.left + rect.width / 2 + window.scrollX;
      } else if (position === 'bottom') {
        top = rect.bottom + window.scrollY;
        left = rect.left + rect.width / 2 + window.scrollX;
      } else if (position === 'left') {
        top = rect.top + rect.height / 2 + window.scrollY;
        left = rect.left + window.scrollX;
      } else {
        top = rect.top + rect.height / 2 + window.scrollY;
        left = rect.right + window.scrollX;
      }
      setCoords({ top, left });
      setOpen(true);
    }, delayMs);
  }

  function hide() {
    clearTimers();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setOpen(false);
    }, hideDelayMs);
  }

  if (!isValidElement(children)) {
    throw new Error('Tooltip: children must be a single React element');
  }

  const child = children as ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    ref?: React.Ref<HTMLElement>;
    'aria-describedby'?: string;
    title?: string;
  }>;

  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      child.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      child.props.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      child.props.onBlur?.(e);
      hide();
    },
    'aria-describedby': open ? tooltipId : undefined,
    // Also pass as `title` so we get a graceful native fallback when JS
    // hasn't hydrated yet. It's removed once the tooltip mounts.
    title: open ? undefined : label,
  });

  return (
    <>
      {trigger}
      {mounted && open && coords
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                zIndex: 70,
                ...POSITION_STYLE[position],
              }}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-elevated"
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  width: ARROW * 1.5,
                  height: ARROW * 1.5,
                  background: 'var(--surface)',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  ...arrowStyle(position),
                }}
              />
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
