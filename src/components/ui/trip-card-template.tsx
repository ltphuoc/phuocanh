import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Link } from '@/i18n/navigation';

interface TripCardTemplateProps {
  readonly badgeLabel: string;
  readonly dateRangeLabel: string;
  readonly eyebrowLabel: string;
  readonly href?: string;
  readonly metaLabel: string;
  readonly note?: string | null;
  readonly title: string;
}

export const TripCardTemplate = ({
  badgeLabel,
  dateRangeLabel,
  eyebrowLabel,
  href,
  metaLabel,
  note,
  title,
}: TripCardTemplateProps): ReactElement => {
  const content = (
    <SectionCard
      className="flex h-full flex-col gap-4"
      surface="glass"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-meta">{eyebrowLabel}</p>
          <p className="ui-card-title mt-2 truncate">{title}</p>
        </div>
        <Badge variant="primary">{badgeLabel}</Badge>
      </div>
      <p className="text-sm font-medium text-foreground/86">{dateRangeLabel}</p>
      <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {metaLabel}
      </p>
      {note?.trim() ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{note}</p>
      ) : null}
    </SectionCard>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      className="block rounded-[var(--radius-panel)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-px"
      href={href}
    >
      {content}
    </Link>
  );
};
