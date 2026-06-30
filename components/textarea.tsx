import { forwardRef, type TextareaHTMLAttributes } from 'react';

export type TextareaProps = {
  error?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error = false, className, disabled, rows = 3, ...rest },
  ref,
) {
  const classes = [
    'textarea',
    error ? 'border-danger focus:border-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <textarea
      ref={ref}
      disabled={disabled}
      rows={rows}
      className={classes}
      {...rest}
    />
  );
});
