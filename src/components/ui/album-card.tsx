import type { ReactElement } from 'react';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Link } from '@/i18n/navigation';

interface AlbumCardProps {
  readonly coverMediaType: 'image' | 'video' | null;
  readonly coverSignedUrl: string | null;
  readonly description: string | null;
  readonly href?: string;
  readonly itemCountLabel: string;
  readonly title: string;
  readonly tripDateRangeLabel: string;
  readonly tripTitle: string;
  readonly videoCoverLabel: string;
}

export const AlbumCard = ({
  coverMediaType,
  coverSignedUrl,
  description,
  href,
  itemCountLabel,
  title,
  tripDateRangeLabel,
  tripTitle,
  videoCoverLabel,
}: AlbumCardProps): ReactElement => {
  const content = (
    <SectionCard
      className="flex h-full flex-col gap-4"
      surface="glass"
    >
      <div className="overflow-hidden rounded-panel border border-white/70 bg-white/70 shadow-whisper">
        {coverMediaType === 'image' && coverSignedUrl ? (
          <div className="relative aspect-[4/3]">
            <Image
              alt={title}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 40vw, 100vw"
              src={coverSignedUrl}
              unoptimized
            />
          </div>
        ) : (
          <div className="ui-gradient-memory flex aspect-[4/3] items-end p-4">
            <div className="rounded-pill border border-white/65 bg-white/78 px-3 py-1.5 text-xs font-semibold tracking-meta text-muted-foreground uppercase shadow-whisper">
              {coverMediaType === 'video' ? videoCoverLabel : itemCountLabel}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="ui-meta">{tripTitle}</p>
          <p className="ui-card-title truncate">{title}</p>
        </div>
        <Badge variant="primary">{itemCountLabel}</Badge>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/86">{tripDateRangeLabel}</p>
        {description?.trim() ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      className="block rounded-panel transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-px"
      href={href}
    >
      {content}
    </Link>
  );
};
