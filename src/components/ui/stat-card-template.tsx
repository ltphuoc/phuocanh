import type { ReactElement } from 'react';

import { SectionCard } from '@/components/ui/section-card';

interface StatCardTemplateProps {
  readonly label: string;
  readonly trendLabel?: string;
  readonly value: string;
}

export const StatCardTemplate = ({
  label,
  trendLabel,
  value,
}: StatCardTemplateProps): ReactElement => (
  <SectionCard
    className="flex flex-col gap-3"
    surface="glass"
  >
    <p className="ui-meta">{label}</p>
    <p className="ui-tabular font-display text-[2.15rem] leading-none text-foreground md:text-[2.35rem]">
      {value}
    </p>
    {trendLabel ? <p className="text-xs text-muted-foreground">{trendLabel}</p> : null}
  </SectionCard>
);
