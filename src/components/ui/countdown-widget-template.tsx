import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

interface CountdownWidgetTemplateProps {
  readonly daysLeft: number;
  readonly eventName: string;
  readonly eventType: string;
}

export const CountdownWidgetTemplate = ({
  daysLeft,
  eventName,
  eventType,
}: CountdownWidgetTemplateProps): ReactElement => (
  <SectionCard className="flex items-center justify-between gap-4" surface="glass">
    <div className="min-w-0">
      <p className="truncate font-display text-[1.55rem] tracking-[-0.03em] text-foreground">
        {eventName}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {eventType}
      </p>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Badge variant="primary">{daysLeft} days</Badge>
      <span className="text-xs text-muted-foreground">remaining</span>
    </div>
  </SectionCard>
);
