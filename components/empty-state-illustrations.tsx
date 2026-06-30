// Custom inline SVG illustrations for empty states. Each is a small
// line-art drawing sized via the parent `className`. The default
// `className` reads as muted line-art in the dashboard.

type IllustrationProps = { className?: string };

const DEFAULT_CLASS = 'h-12 w-12 text-text-subtle';

const SHARED_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  viewBox: '0 0 24 24',
};

export function InboxIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <path d="M3 10 L8.5 10 L10 12 L14 12 L15.5 10 L21 10 V18 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 Z" />
      <path d="M12 14.5 L12 16.5 M11 15.5 L13 15.5" />
    </svg>
  );
}

export function ProjectsIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <path d="M3 7.5 a1 1 0 0 1 1-1 H9.5 L11 8 H20 a1 1 0 0 1 1 1 V18 a1 1 0 0 1-1 1 H4 a1 1 0 0 1-1-1 Z" />
      <circle cx="12" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GoldenIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <path d="M4 6.5 a2 2 0 0 1 2-2 H18 a2 2 0 0 1 2 2 V14 a2 2 0 0 1-2 2 H10 L7 19 V16 H6 a2 2 0 0 1-2-2 Z" />
      <path d="M10.5 9 a1.5 1.5 0 0 1 3 0 c0 0.9-1.5 1.1-1.5 2.4" />
      <circle cx="12" cy="13.4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SourcesIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <path d="M9.5 14.5 a4 4 0 0 1 0-5.6 L11.4 7 a4 4 0 0 1 5.6 0 a4 4 0 0 1 0 5.6 L14.9 14.7" />
      <path d="M14.5 9.5 a4 4 0 0 1 0 5.6 L12.6 17 a4 4 0 0 1-5.6 0 a4 4 0 0 1 0-5.6 L9.1 9.3" />
    </svg>
  );
}

export function RunsIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.5 9 L15 12 L10.5 15 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TriageIllustration({ className = DEFAULT_CLASS }: IllustrationProps = {}) {
  return (
    <svg {...SHARED_PROPS} className={className}>
      <path d="M8 4 L13 6 V10.5 c0 2.4-2 4.4-5 5.5 c-3-1.1-5-3.1-5-5.5 V6 Z" />
      <path d="M6 10 L7.4 11.4 L10 8.8" />
      <g opacity="0.5">
        <path d="M15 8 H20" />
        <path d="M15 11 H20" />
        <path d="M15 14 H18" />
      </g>
    </svg>
  );
}

export const ILLUSTRATION_KEYS = [
  'inbox',
  'projects',
  'golden',
  'sources',
  'runs',
  'triage',
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export const ILLUSTRATIONS: Record<
  IllustrationKey,
  (props?: IllustrationProps) => JSX.Element
> = {
  inbox: InboxIllustration,
  projects: ProjectsIllustration,
  golden: GoldenIllustration,
  sources: SourcesIllustration,
  runs: RunsIllustration,
  triage: TriageIllustration,
};