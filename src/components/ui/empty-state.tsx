import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly title: string;
}

export const EmptyState = ({
  action,
  className,
  description,
  icon,
  title,
}: EmptyStateProps): ReactElement => (
  <div
    className={cn(
      'flex min-h-36 flex-col items-center justify-center gap-3 rounded-[var(--radius-panel)] border border-dashed border-[#e8c8bf] bg-white/58 px-5 py-7 text-center shadow-whisper backdrop-blur-md',
      className,
    )}
  >
    {icon ? (
      <span
        aria-hidden="true"
        className="inline-flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary shadow-whisper"
      >
        {icon}
      </span>
    ) : null}
    <p className="ui-panel-title">{title}</p>
    <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
);
