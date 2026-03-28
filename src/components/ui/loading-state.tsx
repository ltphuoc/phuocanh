import type { ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

interface LoadingStateProps {
  readonly className?: string;
  readonly description?: string;
  readonly title?: string;
}

export const LoadingState = ({
  className,
  description = "Please wait a moment.",
  title = "Loading",
}: LoadingStateProps): ReactElement => (
  <div
    className={cn(
      "flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-muted-soft/70 px-4 py-6 text-center",
      className,
    )}
  >
    <span
      aria-hidden="true"
      className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
    />
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);
