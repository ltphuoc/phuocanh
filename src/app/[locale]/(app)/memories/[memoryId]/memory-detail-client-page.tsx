'use client';

import type { ReactElement } from 'react';

import Image from 'next/image';

import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';

import { MemoryManagementForms } from '@/components/forms/memory-management-forms';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { SectionStack } from '@/components/layout/section-stack';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { EmptyState } from '@/components/ui/empty-state';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { Link } from '@/i18n/navigation';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';

interface MemoryDetailClientPageProps {
  readonly memoryId: string;
}

export const MemoryDetailClientPage = ({ memoryId }: MemoryDetailClientPageProps): ReactElement => {
  const { t: commonT } = useI18n('common');
  const { format, t } = useI18n('memoryDetail');
  const query = useQuery({
    queryFn: () => appQueryFetchers.memory(memoryId),
    queryKey: appQueryKeys.memory(memoryId),
  });

  if (query.isPending) {
    return (
      <PageContainer
        className="pb-8"
        size="reading"
      >
        <SectionStack>
          <QueryLoadingState variant="detail" />
        </SectionStack>
      </PageContainer>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <PageContainer
        className="pb-8"
        size="reading"
      >
        <SectionStack>
          <QueryErrorState onRetry={() => void query.refetch()} />
        </SectionStack>
      </PageContainer>
    );
  }

  const data = query.data;
  const { context, media, memory } = data;
  const firstLine = memory.note?.trim().split('\n')[0] ?? t('header.quoteFallback');
  const happenedAtDate = parseISO(memory.happenedAt);
  const happenedAtLabel = Number.isNaN(happenedAtDate.getTime())
    ? memory.happenedAt
    : format.dateTime(happenedAtDate, {
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        month: 'long',
        timeZone: context.timeZone,
        year: 'numeric',
      });

  return (
    <PageContainer
      className="pb-8"
      size="reading"
    >
      <SectionStack>
        <PageReveal>
          <PageHeader
            action={
              <Link
                className="inline-flex items-center rounded-pill border border-white/70 bg-white/68 px-5 py-3 text-sm font-semibold text-foreground shadow-whisper"
                href="/home"
              >
                {commonT('backHome')}
              </Link>
            }
            description={happenedAtLabel}
            eyebrow={t('header.eyebrow')}
            quote={memory.note?.trim() ? firstLine : undefined}
            surface="hero"
            title={memory.locationName ?? t('header.fallbackLocation')}
          />
        </PageReveal>

        <PageReveal delay={0.06}>
          <SectionCard
            className="flex flex-col gap-5"
            padding="comfortable"
            surface="glass"
          >
            <div className="space-y-3">
              <p className="ui-meta">{t('story.label')}</p>
              <p className="font-display text-heading-lg leading-tight text-foreground">
                {memory.note?.trim() || t('story.empty')}
              </p>
            </div>
            {memory.locationName ? (
              <div className="rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold tracking-meta text-muted-foreground uppercase shadow-whisper">
                {memory.locationName}
              </div>
            ) : null}
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.1}>
          <SectionCard
            className="flex flex-col gap-5"
            padding="comfortable"
            surface="paper"
          >
            <div>
              <p className="ui-meta">{t('media.label')}</p>
              <h2 className="mt-2 font-display text-heading-lg text-foreground">
                {t('media.title')}
              </h2>
            </div>
            <div className="grid gap-4">
              {media.length ? (
                media.map((item) =>
                  item.signedUrl ? (
                    item.mediaType === 'image' ? (
                      <div
                        className="overflow-hidden rounded-hero border border-white/70 shadow-cloud"
                        key={item.id}
                      >
                        <Image
                          alt={t('mediaAlt')}
                          className="h-auto w-full object-cover"
                          height={900}
                          src={item.signedUrl}
                          unoptimized
                          width={1600}
                        />
                      </div>
                    ) : (
                      <video
                        className="w-full rounded-hero border border-white/70 shadow-cloud"
                        controls
                        key={item.id}
                        preload="metadata"
                        src={item.signedUrl}
                      />
                    )
                  ) : (
                    <EmptyState
                      className="h-full"
                      description={t('media.loadErrorDescription')}
                      key={item.id}
                      title={t('media.loadErrorTitle')}
                    />
                  ),
                )
              ) : (
                <EmptyState
                  description={t('media.noneDescription')}
                  title={t('media.noneTitle')}
                />
              )}
            </div>
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.14}>
          <SectionCard
            className="flex flex-col gap-5"
            padding="comfortable"
            surface="paper"
          >
            <div>
              <p className="ui-meta">{t('manage.label')}</p>
              <h2 className="mt-2 font-display text-heading-lg text-foreground">
                {t('manage.title')}
              </h2>
            </div>
            <MemoryManagementForms data={data} />
          </SectionCard>
        </PageReveal>
      </SectionStack>
    </PageContainer>
  );
};
