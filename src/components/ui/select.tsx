import type { ReactElement, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, ...props }: SelectProps): ReactElement => (
  <select
    className={cn(
      "h-11 w-full rounded-2xl border border-border bg-card/95 px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/25",
      className,
    )}
    {...props}
  />
);
