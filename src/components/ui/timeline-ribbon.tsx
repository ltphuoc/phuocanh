'use client';

import type { ReactElement } from 'react';
import type { MemoryCardProps } from '@/components/ui/memory-card';

import { parseISO } from 'date-fns';
import { useFormatter } from 'next-intl';

import { MemoryCard } from '@/components/ui/memory-card';
import { cn } from '@/lib/utils/cn';

export interface TimelineRibbonItem extends Omit<MemoryCardProps, 'variant'> {
  readonly id: string;
}

interface TimelineRibbonProps {
  readonly items: readonly TimelineRibbonItem[];
  readonly timeZone: string;
}

export const TimelineRibbon = ({ items, timeZone }: TimelineRibbonProps): ReactElement => {
  const format = useFormatter();

  return (
    <div className="relative flex flex-col gap-6 pl-4 md:gap-8 md:pl-8">
      <div className="absolute top-0 bottom-0 left-[7px] w-px bg-[linear-gradient(180deg,rgba(255,148,148,0.18)_0%,rgba(255,209,209,0.6)_28%,rgba(255,209,209,0.05)_100%)] md:left-[15px]" />
      {items.map((item, index) => {
        const date = parseISO(item.happenedAt);
        const monthKey = Number.isNaN(date.getTime())
          ? item.happenedAt
          : format.dateTime(date, {
              month: 'long',
              timeZone,
              year: 'numeric',
            });
        const previousItem = items[index - 1];
        const previousDate = previousItem ? parseISO(previousItem.happenedAt) : null;
        const previousMonthKey =
          previousDate && !Number.isNaN(previousDate.getTime())
            ? format.dateTime(previousDate, {
                month: 'long',
                timeZone,
                year: 'numeric',
              })
            : null;
        const shouldRenderDivider = monthKey !== previousMonthKey;

        return (
          <div
            className="relative flex flex-col gap-4"
            key={item.id}
          >
            {shouldRenderDivider ? (
              <div className="sticky top-4 z-10 ml-4 self-start rounded-pill border border-white/72 bg-[rgba(255,249,242,0.84)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase shadow-whisper backdrop-blur-xl md:ml-6">
                {monthKey}
              </div>
            ) : null}
            <div className="relative">
              <div className="absolute top-6 left-[-4px] size-3 rounded-full bg-primary shadow-[0_0_0_8px_rgba(255,148,148,0.14)] md:left-0" />
              <MemoryCard
                className={cn(index % 2 === 0 ? 'md:ml-12' : 'md:mr-12')}
                happenedAt={item.happenedAt}
                href={item.href}
                imageUrl={item.imageUrl}
                locationName={item.locationName}
                mediaType={item.mediaType}
                note={item.note}
                timeZone={timeZone}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
