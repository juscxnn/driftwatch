import { StatusBadge } from '@/components/status-badge';
import { COPY } from '@/lib/copy';
import { formatRelative, formatPercent } from '@/lib/format';
import type { Project, Run, Source } from '@/lib/types';

type OverviewTabProps = {
  project: Project;
  runs: Run[];
  sources: Pick<Source, 'id' | 'last_hash' | 'last_fetched_at' | 'title' | 'uri' | 'kind'>[];
  pendingCount: number;
};

export function OverviewTab({ project, runs, sources, pendingCount }: OverviewTabProps) {
  const lastRun = runs[0] ?? null;
  const totalPassed = runs.reduce((acc, r) => acc + r.passed, 0);
  const totalFailed = runs.reduce((acc, r) => acc + r.failed, 0);
  const totalCount = totalPassed + totalFailed;
  const passRate = totalCount > 0 ? totalPassed / totalCount : 0;
  const sourcesFetched = sources.filter((s) => s.last_fetched_at).length;
  const sourcesOk = sources.length === 0 || sourcesFetched === sources.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={COPY.overview.lastRun}
          value={
            lastRun ? (
              <span className="inline-flex items-center gap-2">
                <StatusBadge kind="run" value={lastRun.status} />
                <span className="muted">{formatRelative(lastRun.started_at)}</span>
              </span>
            ) : (
              <span className="muted">{COPY.overview.neverRun}</span>
            )
          }
        />
        <StatCard
          label={COPY.overview.passRate}
          value={
            <span className="text-2xl font-semibold">
              {totalCount > 0 ? formatPercent(totalPassed, totalCount) : '—'}
            </span>
          }
          sub={
            totalCount > 0
              ? `${totalPassed} passed · ${totalFailed} failed (across ${runs.length} runs)`
              : 'No runs yet'
          }
        />
        <StatCard
          label={COPY.overview.pendingReviews}
          value={
            <span
              className={`text-2xl font-semibold ${
                pendingCount > 0 ? 'text-rose-600' : 'text-text'
              }`}
            >
              {pendingCount}
            </span>
          }
        />
        <StatCard
          label={COPY.overview.sourcesHealth}
          value={
            <span
              className={`text-2xl font-semibold ${
                sourcesOk ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {sources.length === 0 ? '—' : `${sourcesFetched}/${sources.length}`}
            </span>
          }
          sub={sourcesOk ? COPY.overview.sourcesOk : COPY.overview.sourcesStale}
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Pass rate trend</h2>
          <span className="muted">Last {runs.length || 0} runs</span>
        </div>
        <div className="mt-3">
          {runs.length < 2 ? (
            <p className="muted">{COPY.overview.sparklineEmpty}</p>
          ) : (
            <Sparkline
              values={runs
                .slice()
                .reverse()
                .map((r) => (r.total > 0 ? r.passed / r.total : 0))}
              threshold={Number(project.pass_threshold)}
            />
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold">Project</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-textMuted">RAG endpoint</dt>
            <dd className="break-all font-mono">
              {project.rag_endpoint_url ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-textMuted">Pass threshold</dt>
            <dd>{project.pass_threshold}</dd>
          </div>
          <div>
            <dt className="text-textMuted">LLM provider</dt>
            <dd>
              {project.llm_provider} · {project.llm_model}
            </dd>
          </div>
          <div>
            <dt className="text-textMuted">Judge</dt>
            <dd>
              {project.judge_provider} · {project.judge_model}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-textMuted">
        {label}
      </p>
      <div className="mt-2">{value}</div>
      {sub ? <p className="mt-1 text-xs text-textMuted">{sub}</p> : null}
    </div>
  );
}

function Sparkline({
  values,
  threshold,
}: {
  values: number[];
  threshold: number;
}) {
  if (values.length < 2) return null;
  const w = 320;
  const h = 64;
  const pad = 4;
  const stepX = (w - pad * 2) / (values.length - 1);
  const yFor = (v: number) => h - pad - (h - pad * 2) * v;
  const points = values.map((v, i) => [pad + i * stepX, yFor(v)] as const);
  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');
  const area = `${path} L${points[points.length - 1]![0]},${h - pad} L${points[0]![0]},${h - pad} Z`;
  const thresholdY = yFor(threshold);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Pass rate trend"
    >
      <line
        x1={pad}
        x2={w - pad}
        y1={thresholdY}
        y2={thresholdY}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="3 3"
      />
      <path d={area} fill="currentColor" fillOpacity="0.08" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
