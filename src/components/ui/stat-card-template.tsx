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
    <p className="ui-tabular font-display text-display-sm leading-none text-foreground">{value}</p>
    {trendLabel ? <p className="text-xs text-muted-foreground">{trendLabel}</p> : null}
  </SectionCard>
);
