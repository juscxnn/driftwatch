import { useId, type ReactNode } from 'react';

export type FieldProps = {
  label?: string;
  /** Should match the `id` of the inner control so the label clicks-through. */
  htmlFor?: string;
  helper?: string;
  error?: string | null;
  children: ReactNode;
};

export function Field({ label, htmlFor, helper, error, children }: FieldProps) {
  const fallbackId = useId();
  const inputId = htmlFor ?? fallbackId;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col">
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      <div>{children}</div>
      {error ? (
        <p id={errorId} className="error-text" role={hasError ? 'alert' : undefined}>
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="mt-1 text-xs text-text-subtle">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
