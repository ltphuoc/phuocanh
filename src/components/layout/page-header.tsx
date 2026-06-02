import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type PageHeaderSurface = 'glass' | 'hero' | 'paper';

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  readonly action?: ReactNode;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly milestone?: string;
  readonly quote?: string;
  readonly surface?: PageHeaderSurface;
  readonly title: string;
}

export const PageHeader = ({
  action,
  className,
  description,
  eyebrow,
  milestone,
  quote,
  surface = 'glass',
  title,
  ...props
}: PageHeaderProps): ReactElement => (
  <header
    className={cn(
      'relative overflow-hidden border p-5 md:p-7',
      surface === 'hero'
        ? 'ui-gradient-hero rounded-[var(--radius-hero)] border-white/64 shadow-cloud'
        : surface === 'glass'
          ? 'rounded-[var(--radius-hero)] border-white/70 bg-card shadow-whisper'
          : 'rounded-[var(--radius-panel)] border-white/72 bg-card/95 shadow-whisper',
      className,
    )}
    {...props}
  >
    {eyebrow || milestone ? (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        {eyebrow ? <p className="ui-meta ui-couple-mark">{eyebrow}</p> : <span />}
        {milestone ? (
          <span className="rounded-pill bg-white/70 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-foreground uppercase shadow-whisper">
            {milestone}
          </span>
        ) : null}
      </div>
    ) : null}
    <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        <div className="space-y-3">
          <h1 className="ui-page-title">{title}</h1>
          {description ? <p className="ui-page-description max-w-2xl">{description}</p> : null}
        </div>
        {quote ? (
          <p className="ui-quote max-w-xl text-foreground/90">&ldquo;{quote}&rdquo;</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </header>
);
