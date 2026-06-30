import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export type InputProps = {
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, leftIcon, rightIcon, className, disabled, ...rest },
  ref,
) {
  if (!leftIcon && !rightIcon) {
    const inputClasses = [
      'input',
      error ? 'border-danger focus:border-danger' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return <input ref={ref} disabled={disabled} className={inputClasses} {...rest} />;
  }

  const inputClasses = [
    'input',
    leftIcon ? 'pl-9' : '',
    rightIcon ? 'pr-9' : '',
    error ? 'border-danger focus:border-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative block w-full">
      {leftIcon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-text-subtle"
        >
          {leftIcon}
        </span>
      ) : null}
      <input ref={ref} disabled={disabled} className={inputClasses} {...rest} />
      {rightIcon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-subtle"
        >
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
});
