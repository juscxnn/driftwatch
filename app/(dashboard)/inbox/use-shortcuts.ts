'use client';

import { useEffect } from 'react';

/**
 * Minimal key handler shape — keeps the hook decoupled from any particular
 * keyboard library.
 */
export type ShortcutMap = {
  [key: string]: (ev: KeyboardEvent) => void;
};

/**
 * Return true when focus is inside a text-editing element. The keyboard
 * shortcuts on the inbox should never hijack text input.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Return true when the event has modifier keys — we never want shortcuts
 * to fire when the user is, e.g., Cmd+R reloading the page.
 */
function hasModifier(ev: KeyboardEvent): boolean {
  return ev.metaKey || ev.ctrlKey || ev.altKey;
}

export type UseShortcutsOptions = {
  /** When true (default), shortcuts are ignored while the user is typing in
   * an input or textarea. Set false to override (rarely useful). */
  skipWhileTyping?: boolean;
  /** When false, the listener is detached entirely. */
  enabled?: boolean;
};

/**
 * Bind a set of keyboard shortcuts to `document`. Keys are matched
 * case-insensitively against `event.key`. Modifier-keyed combos (Cmd/Ctrl/
 * Alt) are ignored so they don't shadow browser shortcuts.
 *
 * The hook does not own any state — pass stable handlers via the
 * `Shortcuts` memo or accept the re-bind cost per keystroke.
 */
export function useShortcuts(
  shortcuts: ShortcutMap,
  opts: UseShortcutsOptions = {},
): void {
  const { skipWhileTyping = true, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return undefined;

    function onKey(ev: KeyboardEvent) {
      if (hasModifier(ev)) return;
      if (skipWhileTyping && isTypingTarget(ev.target)) return;
      const handler = shortcuts[ev.key];
      if (!handler) return;
      // Let the handler decide if it wants preventDefault.
      handler(ev);
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcuts, skipWhileTyping, enabled]);
}