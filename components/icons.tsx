/**
 * Tiny SVG icon library. Each icon is a 16x16 stroke-1.5 line icon
 * using `currentColor`, so they pick up the surrounding text color.
 *
 * Pass `className` to override the default size (e.g. `h-3.5 w-3.5`).
 * All icons are decorative by default; pass `aria-hidden={false}` and
 * `role="img"` from the caller when used as a meaningful label.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

const baseProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function Icon({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      {...baseProps}
      className={rest.className ?? 'h-4 w-4'}
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 9l1.5-4.5a1 1 0 0 1 .94-.66h6.12a1 1 0 0 1 .94.66L13.5 9" />
      <path d="M2.5 9v3.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9h-3l-1 1.5h-3L5.5 9h-3z" />
      <path d="M8 1.5v3" />
    </Icon>
  );
}

export function ProjectsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4.5a1 1 0 0 1 1-1h2.7a1 1 0 0 1 .8.4l.8 1.1a1 1 0 0 0 .8.4h3.9a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4.5z" />
    </Icon>
  );
}

export function TriageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5L2.75 3.25v4c0 3.25 2.5 5.5 5.25 6.75 2.75-1.25 5.25-3.5 5.25-6.75v-4L8 1.5z" />
      <path d="M5.75 8l1.75 1.75L10.5 6.5" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10" />
      <path d="M3 8h10" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5l3 3 7-7" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5l9 9" />
      <path d="M12.5 3.5l-9 9" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </Icon>
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="3.5" cy="8" r="0.6" fill="currentColor" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
      <circle cx="12.5" cy="8" r="0.6" fill="currentColor" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4.5h11" />
      <path d="M5 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
      <path d="M4 4.5l.7 8a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8" />
      <path d="M7 7v4" />
      <path d="M9 7v4" />
    </Icon>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" />
      <path d="M10 3.5l2.5 2.5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="5" width="8" height="9" rx="1" />
      <path d="M3 11V3a1 1 0 0 1 1-1h7" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3h11l-4 5.5V13l-3-1.5V8.5L2.5 3z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3.5 3.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6l4 4 4-4" />
    </Icon>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10l4-4 4 4" />
    </Icon>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3h4v4" />
      <path d="M13 3l-6 6" />
      <path d="M11 9.5v2.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2.5" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.5" />
      <path d="M8 13v1.5" />
      <path d="M2.5 8H1" />
      <path d="M15 8h-1.5" />
      <path d="M3.7 3.7l1.05 1.05" />
      <path d="M11.25 11.25l1.05 1.05" />
      <path d="M3.7 12.3l1.05-1.05" />
      <path d="M11.25 4.75l1.05-1.05" />
    </Icon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4.5h-5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5" />
      <path d="M6.5 8h7" />
      <path d="M11 5.5l2.5 2.5-2.5 2.5" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4" />
      <circle cx="8" cy="5" r="0.4" fill="currentColor" />
    </Icon>
  );
}