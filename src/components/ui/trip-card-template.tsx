import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

interface TripCardTemplateProps {
  readonly destination: string;
  readonly durationLabel: string;
  readonly itemCountLabel: string;
}

export const TripCardTemplate = ({
  destination,
  durationLabel,
  itemCountLabel,
}: TripCardTemplateProps): ReactElement => (
  <SectionCard className="flex flex-col gap-4" surface="glass">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="ui-meta ui-couple-mark">Trip capsule</p>
        <p className="mt-2 font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
          {destination}
        </p>
      </div>
      <Badge variant="primary">Trip</Badge>
    </div>
    <p className="text-sm text-muted-foreground">{durationLabel}</p>
    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {itemCountLabel}
    </p>
  </SectionCard>
);
