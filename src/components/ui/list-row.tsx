import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ListRowProps {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly meta?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly title: ReactNode;
}

export const ListRow = ({
  action,
  className,
  meta,
  subtitle,
  title,
}: ListRowProps): ReactElement => (
  <div
    className={cn(
      "flex min-h-16 items-center justify-between gap-3 rounded-[1.4rem] border border-white/66 bg-white/64 px-4 py-3 shadow-whisper backdrop-blur-md",
      className,
    )}
  >
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      {meta ? <div className="mt-2">{meta}</div> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
