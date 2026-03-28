import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly description?: string;
  readonly htmlFor?: string;
  readonly label: string;
}

export const FormSection = ({
  children,
  className,
  description,
  htmlFor,
  label,
  ...props
}: FormSectionProps): ReactElement => (
  <div className={cn("flex flex-col gap-3", className)} {...props}>
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {description ? <p className="ui-body-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </div>
);
