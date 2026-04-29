import type { ReactElement, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';

interface GameCardTemplateProps {
  readonly ctaLabel: string;
  readonly description: string;
  readonly title: string;
  readonly trailing?: ReactNode;
}

export const GameCardTemplate = ({
  ctaLabel,
  description,
  title,
  trailing,
}: GameCardTemplateProps): ReactElement => (
  <SectionCard
    className="flex flex-col gap-4"
    surface="glass"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="ui-panel-title">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {trailing}
    </div>
    <Button
      className="w-full md:w-auto"
      variant="outline"
    >
      {ctaLabel}
    </Button>
  </SectionCard>
);
