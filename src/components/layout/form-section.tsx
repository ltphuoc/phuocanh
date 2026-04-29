import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly description?: string;
  readonly errorId?: string;
  readonly errorMessage?: string;
  readonly htmlFor?: string;
  readonly label: string;
}

export const FormSection = ({
  children,
  className,
  description,
  errorId,
  errorMessage,
  htmlFor,
  label,
  ...props
}: FormSectionProps): ReactElement => (
  <div
    className={cn('flex flex-col gap-3', className)}
    {...props}
  >
    <div className="flex flex-col gap-1">
      {htmlFor ? (
        <label
          className="text-sm font-semibold text-foreground"
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : (
        <p className="text-sm font-semibold text-foreground">{label}</p>
      )}
      {description ? <p className="ui-body-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
    {errorMessage ? (
      <p
        aria-live="polite"
        className="text-sm font-medium text-error"
        id={errorId}
      >
        {errorMessage}
      </p>
    ) : null}
  </div>
);
