export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-24 rounded bg-surface-muted" />
        <div className="h-4 w-64 rounded bg-surface-muted" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="h-4 w-40 rounded bg-surface-muted" />
            <div className="h-3 w-full rounded bg-surface-muted" />
            <div className="h-3 w-3/4 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
