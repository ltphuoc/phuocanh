'use client';

import type { ReactElement } from 'react';
import type { TimelineRibbonItem } from '@/components/ui/timeline-ribbon';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Flower2, Heart, Sparkles } from 'lucide-react';

import { ChecklistItemForm } from '@/components/forms/checklist-item-form';
import { ChecklistToggleForm } from '@/components/forms/checklist-toggle-form';
import { CreateChecklistForm } from '@/components/forms/create-checklist-form';
import { InviteLinkForm } from '@/components/forms/invite-link-form';
import { WishItemForm } from '@/components/forms/wish-item-form';
import { PageHeader } from '@/components/layout/page-header';
import { SectionStack } from '@/components/layout/section-stack';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { AnniversarySpotlight } from '@/components/ui/anniversary-spotlight';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { InsetPanel } from '@/components/ui/inset-panel';
import { ListRow } from '@/components/ui/list-row';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { TimelineRibbon } from '@/components/ui/timeline-ribbon';
import { useI18n } from '@/hooks/useI18n';
import { Link } from '@/i18n/navigation';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';

const categoryTranslationKeyByValue = {
  food: 'category.food',
  movie: 'category.movie',
  place: 'category.place',
} as const;

export const HomeClientPage = (): ReactElement => {
  const { t: homeT } = useI18n('home');
  const { t: wishItemFormT } = useI18n('forms.wishItem');
  const query = useQuery({
    queryFn: appQueryFetchers.home,
    queryKey: appQueryKeys.home(),
  });

  if (query.isPending) {
    return (
      <main className="pb-6">
        <SectionStack>
          <QueryLoadingState />
        </SectionStack>
      </main>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <main className="pb-6">
        <SectionStack>
          <QueryErrorState onRetry={() => void query.refetch()} />
        </SectionStack>
      </main>
    );
  }

  const data = query.data;
  const timelineItems: readonly TimelineRibbonItem[] = data.memories.map((memory) => ({
    happenedAt: memory.happenedAt,
    href: `/memories/${memory.id}`,
    id: memory.id,
    imageUrl: memory.imageUrl,
    locationName: memory.locationName,
    mediaType: memory.mediaType,
    note: memory.note,
    timeZone: data.context.timeZone,
  }));
  const featuredMemory = data.memories[0]
    ? {
        happenedAt: data.memories[0].happenedAt,
        href: `/memories/${data.memories[0].id}`,
        imageUrl: data.memories[0].imageUrl,
        locationName: data.memories[0].locationName,
        mediaType: data.memories[0].mediaType,
        note: data.memories[0].note,
      }
    : null;

  return (
    <main className="pb-6">
      <SectionStack>
        <PageReveal>
          <AnniversarySpotlight
            coupleStartedAt={data.context.coupleStartedAt}
            featuredMemory={featuredMemory}
            relationshipDays={data.relationshipDays}
            timeZone={data.context.timeZone}
          />
        </PageReveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <PageReveal delay={0.05}>
            <section className="flex flex-col gap-6">
              <PageHeader
                action={
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="ui-gradient-active inline-flex items-center rounded-pill px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cloud"
                      href="/memories/new"
                    >
                      {homeT('addMemory')}
                    </Link>
                    <InviteLinkForm />
                  </div>
                }
                description={homeT('header.description')}
                eyebrow={homeT('header.eyebrow')}
                quote={homeT('header.quote')}
                surface="paper"
                title={homeT('header.title')}
              />
              {timelineItems.length ? (
                <TimelineRibbon
                  items={timelineItems}
                  timeZone={data.context.timeZone}
                />
              ) : (
                <EmptyState
                  description={homeT('timelineEmpty.description')}
                  icon={
                    <Flower2
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={2.2}
                    />
                  }
                  title={homeT('timelineEmpty.title')}
                />
              )}
            </section>
          </PageReveal>

          <div className="flex flex-col gap-6">
            <PageReveal delay={0.1}>
              <SectionCard
                className="flex flex-col gap-5"
                padding="comfortable"
                surface="glass"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-meta ui-couple-mark">{homeT('wishlist.eyebrow')}</p>
                    <h2 className="ui-card-title mt-2">{homeT('wishlist.title')}</h2>
                  </div>
                  <Sparkles
                    aria-hidden="true"
                    className="size-5 text-primary"
                    strokeWidth={2.2}
                  />
                </div>
                <WishItemForm />
                <div className="flex flex-col gap-3">
                  {data.wishItems.length ? (
                    data.wishItems.map((item) => (
                      <ListRow
                        key={item.id}
                        meta={
                          <Badge>
                            {wishItemFormT(categoryTranslationKeyByValue[item.category])}
                          </Badge>
                        }
                        subtitle={item.note}
                        title={item.title}
                      />
                    ))
                  ) : (
                    <EmptyState
                      description={homeT('wishlist.empty.description')}
                      icon={
                        <Heart
                          aria-hidden="true"
                          className="size-4"
                          strokeWidth={2.2}
                        />
                      }
                      title={homeT('wishlist.empty.title')}
                    />
                  )}
                </div>
              </SectionCard>
            </PageReveal>

            <PageReveal delay={0.15}>
              <SectionCard
                className="flex flex-col gap-5"
                padding="comfortable"
                surface="petal"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-meta ui-couple-mark">{homeT('checklists.eyebrow')}</p>
                    <h2 className="ui-card-title mt-2">{homeT('checklists.title')}</h2>
                  </div>
                  <ClipboardList
                    aria-hidden="true"
                    className="size-5 text-primary"
                    strokeWidth={2.2}
                  />
                </div>
                <CreateChecklistForm />
                <div className="flex flex-col gap-4">
                  {data.checklists.length ? (
                    data.checklists.map((checklist) => (
                      <InsetPanel
                        className="flex flex-col gap-4"
                        key={checklist.id}
                      >
                        <div>
                          <p className="ui-meta">{homeT('checklists.sectionLabel')}</p>
                          <h3 className="ui-panel-title mt-2 break-words">{checklist.title}</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                          {checklist.items.map((item) => (
                            <ListRow
                              action={
                                <ChecklistToggleForm
                                  checklistItemId={item.id}
                                  isDone={item.isDone}
                                />
                              }
                              key={item.id}
                              subtitle={
                                item.isDone
                                  ? homeT('checklists.completed')
                                  : homeT('checklists.pending')
                              }
                              title={item.text}
                            />
                          ))}
                        </div>
                        <ChecklistItemForm checklistId={checklist.id} />
                      </InsetPanel>
                    ))
                  ) : (
                    <EmptyState
                      description={homeT('checklists.empty.description')}
                      icon={
                        <ClipboardList
                          aria-hidden="true"
                          className="size-4"
                          strokeWidth={2.2}
                        />
                      }
                      title={homeT('checklists.empty.title')}
                    />
                  )}
                </div>
              </SectionCard>
            </PageReveal>
          </div>
        </div>
      </SectionStack>
    </main>
  );
};
