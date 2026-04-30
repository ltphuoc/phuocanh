'use client';

import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { SectionStack } from '@/components/layout/section-stack';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { EmptyState } from '@/components/ui/empty-state';
import { MemoryCard } from '@/components/ui/memory-card';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';

export const OnThisDayClientPage = (): ReactElement => {
  const { t: onThisDayT } = useI18n('onThisDay');
  const query = useQuery({
    queryFn: appQueryFetchers.onThisDay,
    queryKey: appQueryKeys.onThisDay(),
  });

  if (query.isPending) {
    return (
      <main>
        <SectionStack>
          <QueryLoadingState />
        </SectionStack>
      </main>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <main>
        <SectionStack>
          <QueryErrorState onRetry={() => void query.refetch()} />
        </SectionStack>
      </main>
    );
  }

  const { context, memories } = query.data;
  const stackedMemories = memories.slice(0, 3);

  return (
    <main>
      <SectionStack>
        <PageReveal>
          <PageHeader
            description={onThisDayT('header.description')}
            eyebrow={onThisDayT('header.eyebrow')}
            quote={onThisDayT('header.quote')}
            surface="hero"
            title={onThisDayT('header.title')}
          />
        </PageReveal>

        {memories.length ? (
          <PageReveal delay={0.05}>
            <SectionCard
              hoverLift={false}
              padding="comfortable"
              surface="glass"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="ui-meta ui-couple-mark">{onThisDayT('stackedReveal.eyebrow')}</p>
                  <h2 className="mt-2 font-display text-[2rem] text-foreground">
                    {onThisDayT('stackedReveal.title')}
                  </h2>
                </div>
                <div className="rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase shadow-whisper">
                  {onThisDayT('stackedReveal.chapterCount', {
                    count: memories.length,
                  })}
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="relative min-h-[320px]">
                  {stackedMemories.map((memory, index) => (
                    <div
                      className="absolute inset-x-0 transition-transform"
                      key={memory.id}
                      style={{
                        top: `${index * 18}px`,
                        transform: `rotate(${index === 0 ? '-2.5deg' : index === 1 ? '1.5deg' : '-0.5deg'})`,
                        zIndex: stackedMemories.length - index,
                      }}
                    >
                      <MemoryCard
                        happenedAt={memory.happenedAt}
                        href={`/memories/${memory.id}`}
                        imageUrl={memory.imageUrl}
                        locationName={memory.locationName}
                        mediaType={memory.mediaType}
                        note={memory.note}
                        timeZone={context.timeZone}
                        variant="anniversary"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {memories.map((memory) => (
                    <MemoryCard
                      happenedAt={memory.happenedAt}
                      href={`/memories/${memory.id}`}
                      imageUrl={memory.imageUrl}
                      key={memory.id}
                      locationName={memory.locationName}
                      mediaType={memory.mediaType}
                      note={memory.note}
                      timeZone={context.timeZone}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </SectionCard>
          </PageReveal>
        ) : (
          <EmptyState
            description={onThisDayT('empty.description')}
            icon={
              <CalendarDays
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
            }
            title={onThisDayT('empty.title')}
          />
        )}
      </SectionStack>
    </main>
  );
};
