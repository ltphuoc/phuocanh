import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

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
      'flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-white/72 bg-white/68 px-4 py-3 shadow-whisper backdrop-blur-md',
      className,
    )}
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold break-words text-foreground">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-xs break-words text-muted-foreground">{subtitle}</p>
      ) : null}
      {meta ? <div className="mt-2">{meta}</div> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
