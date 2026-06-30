'use client';

import { useState } from 'react';
import { Dialog } from './dialog';
import { Button } from './button';
import { Input } from './input';

export type ConfirmVariant = 'danger' | 'default';

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  /** When set, renders a "type this to confirm" input. The Confirm button
   * is disabled until the user types `requireTextMatch` exactly. */
  requireTextMatch?: string;
  /** Helper text displayed directly above the type-to-confirm input. */
  requireTextLabel?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  requireTextMatch,
  requireTextLabel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const requiresTypeMatch = Boolean(requireTextMatch);
  const matches =
    !requiresTypeMatch || (requireTextMatch ? typed === requireTextMatch : false);
  const canConfirm = matches && !loading;
  const titleClassName = variant === 'danger' ? 'text-danger' : undefined;
  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      titleClassName={titleClassName}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => {
              void onConfirm();
            }}
            disabled={!canConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requiresTypeMatch ? (
        <div className="flex flex-col gap-1.5">
          {requireTextLabel ? (
            <label htmlFor="confirm-input" className="label">
              {requireTextLabel}
            </label>
          ) : null}
          <Input
            id="confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            error={typed.length > 0 && !matches}
          />
        </div>
      ) : null}
    </Dialog>
  );
}
