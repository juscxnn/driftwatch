import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, body, action, icon }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-12">
      {icon ? <div className="mb-3 text-textMuted">{icon}</div> : null}
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {body ? <p className="mt-1 max-w-sm muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
