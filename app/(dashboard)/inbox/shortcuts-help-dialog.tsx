'use client';

import { Dialog } from '@/components/dialog';
import { COPY } from '@/lib/copy';

export type ShortcutsHelpDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ShortcutsHelpDialog({ open, onClose }: ShortcutsHelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={COPY.inbox.shortcuts.helpTitle}
      description={COPY.inbox.shortcuts.helpIntro}
      size="sm"
    >
      <div className="space-y-4 text-sm">
        <ShortcutGroup
          title={COPY.inbox.shortcuts.groups.nav}
          items={[
            { key: 'j', label: COPY.inbox.shortcuts.keys.j },
            { key: 'k', label: COPY.inbox.shortcuts.keys.k },
          ]}
        />
        <ShortcutGroup
          title={COPY.inbox.shortcuts.groups.actions}
          items={[
            { key: 'a', label: COPY.inbox.shortcuts.keys.a },
            { key: 'r', label: COPY.inbox.shortcuts.keys.r },
            { key: 'e', label: COPY.inbox.shortcuts.keys.e },
          ]}
        />
        <ShortcutGroup
          title="Help"
          items={[
            { key: '?', label: COPY.inbox.shortcuts.keys.question },
            { key: 'Esc', label: COPY.inbox.shortcuts.keys.escape },
          ]}
        />
        <p className="text-xs text-text-subtle">{COPY.inbox.shortcuts.note}</p>
      </div>
    </Dialog>
  );
}

function ShortcutGroup({
  title,
  items,
}: {
  title: string;
  items: { key: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs uppercase tracking-wide text-text-muted">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <ShortcutRow key={item.key} combo={item.key} label={item.label} />
        ))}
      </dl>
    </div>
  );
}

function ShortcutRow({ combo, label }: { combo: string; label: string }) {
  return (
    <>
      <dt>
        <Kbd>{combo}</Kbd>
      </dt>
      <dd className="self-center text-text-muted">{label}</dd>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-surface-muted px-1.5 font-mono text-[11px] text-text">
      {children}
    </kbd>
  );
}