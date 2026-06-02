import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';

interface CountdownWidgetTemplateProps {
  readonly daysLeftLabel: string;
  readonly eventName: string;
  readonly eventType: string;
  readonly note?: string | null;
  readonly remainingLabel: string;
  readonly targetDateLabel?: string;
}

export const CountdownWidgetTemplate = ({
  daysLeftLabel,
  eventName,
  eventType,
  note,
  remainingLabel,
  targetDateLabel,
}: CountdownWidgetTemplateProps): ReactElement => (
  <SectionCard
    className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    surface="glass"
  >
    <div className="min-w-0">
      <p className="font-display text-[1.35rem] leading-tight break-words text-foreground sm:text-[1.55rem]">
        {eventName}
      </p>
      <p className="mt-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {eventType}
      </p>
      {targetDateLabel ? (
        <p className="mt-3 text-sm font-medium text-foreground/86">{targetDateLabel}</p>
      ) : null}
      {note?.trim() ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{note}</p>
      ) : null}
    </div>
    <div className="flex min-w-0 shrink-0 flex-row items-center gap-2 text-left sm:flex-col sm:items-end sm:text-right">
      <Badge
        className="ui-tabular shrink-0 leading-snug whitespace-nowrap"
        variant="primary"
      >
        {daysLeftLabel}
      </Badge>
      <span className="text-xs break-words text-muted-foreground">{remainingLabel}</span>
    </div>
  </SectionCard>
);
