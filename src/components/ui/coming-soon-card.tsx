import type { ReactElement } from 'react';

import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Link } from '@/i18n/navigation';

interface ComingSoonCardProps {
  readonly badgeLabel: string;
  readonly ctaHref?: string;
  readonly ctaLabel?: string;
  readonly description: string;
  readonly title: string;
}

export const ComingSoonCard = ({
  badgeLabel,
  ctaHref,
  ctaLabel,
  description,
  title,
}: ComingSoonCardProps): ReactElement => (
  <SectionCard
    className="flex flex-col gap-5"
    padding="comfortable"
    surface="glass"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Sparkles
          aria-hidden="true"
          className="size-4 text-primary"
          strokeWidth={2.2}
        />
        <p className="ui-panel-title">{title}</p>
      </div>
      <Badge variant="primary">{badgeLabel}</Badge>
    </div>
    <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
    {ctaHref && ctaLabel ? (
      <Link
        className="inline-flex h-11 w-fit items-center rounded-pill border border-white/70 bg-white/68 px-5 text-sm font-semibold text-foreground shadow-whisper transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/85"
        href={ctaHref}
      >
        {ctaLabel}
      </Link>
    ) : null}
  </SectionCard>
);
