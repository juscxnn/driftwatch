import type { ReactNode } from 'react';
import {
  ILLUSTRATIONS,
  IllustrationKey,
} from './empty-state-illustrations';

type EmptyStateProps = {
  title: string;
  body?: string;
  action?: ReactNode;
  /** Either a ReactNode (custom icon) or one of the built-in illustration keys. */
  illustration?: ReactNode | IllustrationKey;
  /** @deprecated prefer `illustration`. Kept for backward compat. */
  icon?: ReactNode;
};

const ILLUSTRATION_CLASS = 'h-16 w-16 text-text-subtle mx-auto';

export function EmptyState({
  title,
  body,
  action,
  illustration,
  icon,
}: EmptyStateProps) {
  let resolved: ReactNode = null;
  if (illustration !== undefined && illustration !== null) {
    if (typeof illustration === 'string') {
      const Comp = ILLUSTRATIONS[illustration as IllustrationKey];
      resolved = <Comp className={ILLUSTRATION_CLASS} />;
    } else {
      resolved = illustration;
    }
  } else if (icon) {
    resolved = icon;
  }

  return (
    <div className="card flex flex-col items-center justify-center text-center py-12">
      {resolved ? <div className="mb-3 text-text-muted">{resolved}</div> : null}
      <h3 className="text-base font-medium text-text">{title}</h3>
      {body ? <p className="mt-1 max-w-sm muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
