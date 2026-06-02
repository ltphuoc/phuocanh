import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly description?: string;
  readonly errorId?: string;
  readonly errorMessage?: string;
  /**
   * Id of the control this section labels. Single-control sections must pass it so the
   * rendered `<label>` is correctly associated. Group sections pass the first control's id.
   */
  readonly htmlFor?: string;
  readonly label: string;
  /**
   * Marks the field as required: appends a visual asterisk to the label. This is a
   * VISUAL marker only — the consumer is responsible for wiring `aria-required` on the
   * input (single-control sections) or `role="..."` + `aria-required` on the wrapping
   * group element (radio/checkbox group sections).
   */
  readonly required?: boolean;
}

export const FormSection = ({
  children,
  className,
  description,
  errorId,
  errorMessage,
  htmlFor,
  label,
  required = false,
  ...props
}: FormSectionProps): ReactElement => (
  <div
    className={cn('flex flex-col gap-3', className)}
    {...props}
  >
    <div className="flex flex-col gap-1">
      <label
        className="text-sm font-semibold text-foreground"
        htmlFor={htmlFor}
      >
        {label}
        {required ? (
          <span
            aria-hidden="true"
            className="ml-0.5 text-error"
          >
            *
          </span>
        ) : null}
      </label>
      {description ? <p className="ui-body-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
    {errorMessage ? (
      <p
        className="text-sm font-medium text-error"
        id={errorId}
        role="alert"
      >
        {errorMessage}
      </p>
    ) : null}
  </div>
);
