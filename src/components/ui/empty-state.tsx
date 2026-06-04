import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly title: string;
  /**
   * Heading level for the title. Defaults to `h2`; pass `h3` when the empty state sits
   * inside a card that already owns an `h2`, to keep heading order valid on the page.
   */
  readonly titleAs?: 'h2' | 'h3';
}

export const EmptyState = ({
  action,
  className,
  description,
  icon,
  title,
  titleAs: TitleTag = 'h2',
}: EmptyStateProps): ReactElement => (
  <div
    className={cn(
      'flex min-h-36 flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-stroke-soft bg-panel px-5 py-7 text-center shadow-whisper',
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
    <TitleTag className="ui-panel-title">{title}</TitleTag>
    <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
);
