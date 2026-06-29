export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-24 rounded bg-surface-muted" />
        <div className="h-4 w-64 rounded bg-surface-muted" />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="h-9 border-b border-border bg-surface-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-border px-4 py-3"
          >
            <div className="h-4 w-32 rounded bg-surface-muted" />
            <div className="h-4 flex-1 rounded bg-surface-muted" />
            <div className="h-4 w-24 rounded bg-surface-muted" />
            <div className="h-4 w-16 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
