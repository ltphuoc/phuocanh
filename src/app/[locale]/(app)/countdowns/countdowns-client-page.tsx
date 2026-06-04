'use client';

import type { ReactElement } from 'react';
import type { CountdownCard } from '@/lib/server/phase-two-data';

import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { BellRing, CalendarHeart, Hourglass } from 'lucide-react';

import { CreateCountdownForm } from '@/components/forms/create-countdown-form';
import { ResponsiveGrid } from '@/components/layout/responsive-grid';
import { ShellPage } from '@/components/layout/shell-page';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { CountdownWidgetTemplate } from '@/components/ui/countdown-widget-template';
import { EmptyState } from '@/components/ui/empty-state';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';

const kindTranslationKeyByValue = {
  anniversary: 'kind.anniversary',
  birthday: 'kind.birthday',
  custom: 'kind.custom',
  plan: 'kind.plan',
  travel: 'kind.travel',
} as const;

export const CountdownsClientPage = (): ReactElement => {
  const { format, t: countdownsT } = useI18n('countdowns');
  const { t: countdownUiT } = useI18n('ui.countdown');
  const query = useQuery({
    queryFn: appQueryFetchers.countdowns,
    queryKey: appQueryKeys.countdowns(),
  });

  const getCountdownBadgeLabel = (countdown: CountdownCard): string => {
    if (countdown.daysFromToday === 0) {
      return countdownUiT('today');
    }

    if (countdown.daysFromToday > 0) {
      return countdownUiT('daysLeft', { count: countdown.daysFromToday });
    }

    return countdownUiT('daysAgo', { count: Math.abs(countdown.daysFromToday) });
  };

  const getCountdownMetaLabel = (countdown: CountdownCard): string => {
    if (countdown.daysFromToday === 0) {
      return countdownUiT('todayHint');
    }

    return countdown.daysFromToday > 0 ? countdownUiT('remaining') : countdownUiT('since');
  };

  const formatCountdownDate = (countdown: CountdownCard, timeZone: string): string => {
    const date = parseISO(countdown.targetAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? countdown.targetAt.slice(0, 10)
      : format.dateTime(date, {
          day: 'numeric',
          month: 'short',
          timeZone,
          year: 'numeric',
        });

    return countdownUiT('date', {
      date: dateLabel,
    });
  };

  if (query.isPending) {
    return (
      <ShellPage
        description={countdownsT('header.description')}
        eyebrow={countdownsT('header.eyebrow')}
        title={countdownsT('header.title')}
      >
        <QueryLoadingState variant="card-grid" />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        description={countdownsT('header.description')}
        eyebrow={countdownsT('header.eyebrow')}
        title={countdownsT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;

  return (
    <ShellPage
      description={countdownsT('header.description')}
      eyebrow={countdownsT('header.eyebrow')}
      title={countdownsT('header.title')}
    >
      <PageReveal delay={0.04}>
        <SectionCard
          className="flex flex-col gap-5"
          padding="comfortable"
          surface="glass"
        >
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT('composer.eyebrow')}</p>
            <h2 className="font-display text-heading-lg text-foreground">
              {countdownsT('composer.title')}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {countdownsT('composer.description')}
            </p>
          </div>
          <CreateCountdownForm />
        </SectionCard>
      </PageReveal>

      <PageReveal delay={0.08}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT('sections.upcomingEyebrow')}</p>
            <h2 className="font-display text-heading text-foreground">
              {countdownsT('sections.upcomingTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {countdownsT('sections.upcomingDescription')}
            </p>
          </div>

          {data.upcoming.length ? (
            <ResponsiveGrid
              columns={2}
              density="compact"
            >
              {data.upcoming.map((countdown) => (
                <CountdownWidgetTemplate
                  daysLeftLabel={getCountdownBadgeLabel(countdown)}
                  eventName={countdown.title}
                  eventType={countdownsT(kindTranslationKeyByValue[countdown.kind])}
                  key={countdown.id}
                  note={countdown.note}
                  remainingLabel={getCountdownMetaLabel(countdown)}
                  targetDateLabel={formatCountdownDate(countdown, data.context.timeZone)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={countdownsT('empty.upcoming.description')}
              icon={
                <CalendarHeart
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
              }
              title={countdownsT('empty.upcoming.title')}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.12}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT('sections.pastEyebrow')}</p>
            <h2 className="font-display text-heading text-foreground">
              {countdownsT('sections.pastTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {countdownsT('sections.pastDescription')}
            </p>
          </div>

          {data.past.length ? (
            <ResponsiveGrid
              columns={2}
              density="compact"
            >
              {data.past.map((countdown) => (
                <CountdownWidgetTemplate
                  daysLeftLabel={getCountdownBadgeLabel(countdown)}
                  eventName={countdown.title}
                  eventType={countdownsT(kindTranslationKeyByValue[countdown.kind])}
                  key={countdown.id}
                  note={countdown.note}
                  remainingLabel={getCountdownMetaLabel(countdown)}
                  targetDateLabel={formatCountdownDate(countdown, data.context.timeZone)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={countdownsT('empty.past.description')}
              icon={
                <Hourglass
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
              }
              title={countdownsT('empty.past.title')}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.16}>
        <SectionCard
          className="flex flex-col gap-3"
          padding="comfortable"
          surface="paper"
        >
          <div className="flex items-center gap-3">
            <BellRing
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth={2.1}
            />
            <p className="font-display text-title text-foreground">
              {countdownsT('automationNote.title')}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {countdownsT('automationNote.description')}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
