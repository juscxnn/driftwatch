'use client';

import { useState, useTransition } from 'react';

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

const COPY_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15 H4 a2 2 0 0 1-2-2 V4 a2 2 0 0 1 2-2 H13 a2 2 0 0 1 2 2 V5" />
  </svg>
);

const CHECK_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12 L10 17 L19 7" />
  </svg>
);

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  if (!text) return null;
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const ok = await copyToClipboard(text);
      if (!ok) return;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    });
  }

  const classes = ['btn-ghost', 'h-8', 'w-8', 'p-2', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={classes}
    >
      {success ? CHECK_ICON : COPY_ICON}
    </button>
  );
}