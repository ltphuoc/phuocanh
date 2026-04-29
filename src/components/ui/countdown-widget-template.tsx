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
    className="flex items-start justify-between gap-4"
    surface="glass"
  >
    <div className="min-w-0">
      <p className="truncate font-display text-[1.55rem] tracking-[-0.03em] text-foreground">
        {eventName}
      </p>
      <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {eventType}
      </p>
      {targetDateLabel ? (
        <p className="mt-3 text-sm font-medium text-foreground/86">{targetDateLabel}</p>
      ) : null}
      {note?.trim() ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{note}</p>
      ) : null}
    </div>
    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
      <Badge variant="primary">{daysLeftLabel}</Badge>
      <span className="text-xs text-muted-foreground">{remainingLabel}</span>
    </div>
  </SectionCard>
);
