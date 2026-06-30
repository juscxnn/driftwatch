import type { CSSProperties, ReactNode } from 'react';

export type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className, style }: SkeletonProps) {
  const classes = ['animate-pulse rounded-md bg-surface-muted', className]
    .filter(Boolean)
    .join(' ');
  return <div aria-hidden className={classes} style={style} />;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  className,
}: {
  lines?: number;
  /** Tailwind width class for the final line, e.g. '60%' → w-[60%]. */
  lastLineWidth?: string;
  className?: string;
}) {
  const items: ReactNode[] = [];
  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1;
    const widthClass = isLast ? '' : 'w-full';
    const styleWidth = isLast ? { width: lastLineWidth } : undefined;
    items.push(
      <Skeleton
        key={i}
        className={`h-3 ${widthClass} ${className ?? ''}`.trim()}
        style={styleWidth}
      />,
    );
  }
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {items}
    </div>
  );
}
