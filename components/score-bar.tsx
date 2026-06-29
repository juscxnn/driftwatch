type ScoreBarProps = {
  score: number | null | undefined;
  threshold?: number;
  reasoning?: string | null;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function ScoreBar({ score, threshold = 0.7, reasoning }: ScoreBarProps) {
  if (score == null) {
    return <span className="muted">—</span>;
  }
  const value = clamp01(score);
  const passed = value >= threshold;
  const barColor = passed ? 'bg-emerald-500' : 'bg-rose-500';
  const thresholdPct = clamp01(threshold) * 100;

  const tooltip = reasoning
    ? `Judge reasoning: ${reasoning}`
    : `Score ${value.toFixed(2)} (threshold ${threshold.toFixed(2)})`;

  return (
    <div className="flex items-center gap-2 min-w-[140px]" title={tooltip}>
      <div className="relative h-2 flex-1 rounded-full bg-surfaceMuted overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${barColor}`}
          style={{ width: `${value * 100}%` }}
          aria-hidden
        />
        <div
          className="absolute inset-y-[-2px] w-px bg-text/40"
          style={{ left: `${thresholdPct}%` }}
          aria-hidden
        />
      </div>
      <span className="w-10 text-right text-xs font-mono text-text">
        {value.toFixed(2)}
      </span>
    </div>
  );
}
