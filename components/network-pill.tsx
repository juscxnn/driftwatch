'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a small "Offline" pill when the browser is offline.
 * Slides in from the corner; click-to-dismiss persists for the session.
 */
export function NetworkPill() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    function goOnline() {
      setOffline(false);
      setDismissed(false);
    }
    function goOffline() {
      setOffline(true);
      setDismissed(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0">
      <div className="flex items-center gap-2 rounded-md border border-warn-muted bg-warn-muted px-3 py-1.5 text-xs">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-warn" />
        <span className="text-text">Offline — changes will sync when you reconnect.</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-text-muted hover:text-text"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}