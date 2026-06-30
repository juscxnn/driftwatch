'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  durationMs: number;
};

type ToastInput =
  | string
  | { title: string; body?: string; variant?: ToastVariant; durationMs?: number };

type ToastContextValue = {
  toasts: Toast[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Sugar: `toast.success('Saved')`, `toast.error('Failed', e?.message)`. */
export const toast = {
  success(title: string, body?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('driftwatch:toast', { detail: { title, body, variant: 'success' } }));
    }
  },
  error(title: string, body?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('driftwatch:toast', { detail: { title, body, variant: 'error' } }));
    }
  },
  info(title: string, body?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('driftwatch:toast', { detail: { title, body, variant: 'info' } }));
    }
  },
};

let nextId = 0;
function genId() {
  nextId += 1;
  return `t-${Date.now().toString(36)}-${nextId}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = genId();
      const toast: Toast =
        typeof input === 'string'
          ? { id, variant: 'info', title: input, durationMs: 5000 }
          : {
              id,
              variant: input.variant ?? 'info',
              title: input.title,
              body: input.body,
              durationMs: input.durationMs ?? 5000,
            };
      setToasts((prev) => [...prev, toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), toast.durationMs),
      );
      return id;
    },
    [dismiss],
  );

  // Listen for global toast events emitted via `toast.success(...)` etc.
  useEffect(() => {
    function onToast(ev: Event) {
      const detail = (ev as CustomEvent<{ title: string; body?: string; variant?: ToastVariant }>).detail;
      push({ title: detail.title, body: detail.body, variant: detail.variant ?? 'info' });
    }
    window.addEventListener('driftwatch:toast', onToast as EventListener);
    return () => window.removeEventListener('driftwatch:toast', onToast as EventListener);
  }, [push]);

  // Cleanup all timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const accent =
    toast.variant === 'success'
      ? 'border-success/30'
      : toast.variant === 'error'
        ? 'border-danger/40'
        : 'border-border';
  const dot =
    toast.variant === 'success'
      ? 'bg-success'
      : toast.variant === 'error'
        ? 'bg-danger'
        : 'bg-brand';
  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto w-full max-w-sm rounded-md border ${accent} bg-surface text-text shadow-elevated`}
    >
      <div className="flex items-start gap-3 p-3">
        <span aria-hidden className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.body ? <p className="mt-0.5 text-xs text-text-muted">{toast.body}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="ml-2 text-text-subtle hover:text-text"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}