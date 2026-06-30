'use client';

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Briefly flip the button to a checkmark for 1.5s after activation. */
  success?: boolean;
  icon?: ReactNode;
  /** Render as a child element (e.g. <a>) by passing it via children.
   * The button styling + props are merged onto the child. */
  asChild?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: ReactNode;
  };

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    success = false,
    icon,
    asChild = false,
    type,
    disabled,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!success) {
      setShowSuccess(false);
      return;
    }
    setShowSuccess(true);
    const t = window.setTimeout(() => setShowSuccess(false), 1500);
    return () => window.clearTimeout(t);
  }, [success]);

  const isBusy = loading || showSuccess;

  const classes = [
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    'relative',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {showSuccess ? (
        <CheckIcon />
      ) : loading ? (
        <Spinner />
      ) : icon ? (
        <span aria-hidden className="-ml-0.5 inline-flex">
          {icon}
        </span>
      ) : null}
      {children ? <span className={showSuccess ? 'sr-only' : undefined}>{children}</span> : null}
      {loading && !showSuccess ? <span className="sr-only">Loading</span> : null}
    </>
  );

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error('Button: asChild requires a single React element child');
    }
    const child = children as React.ReactElement<{
      className?: string;
      ref?: React.Ref<unknown>;
    }>;
    return cloneElement(child, {
      ...rest,
      ref,
      className: [child.props.className, classes].filter(Boolean).join(' '),
    });
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || isBusy}
      onClick={onClick}
      className={classes}
      aria-busy={loading || undefined}
      data-state={showSuccess ? 'success' : loading ? 'loading' : undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7.5L5.5 10L11 4.5" />
    </svg>
  );
}
