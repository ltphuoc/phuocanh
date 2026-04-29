'use client';

import type { ReactElement } from 'react';
import type { TripCard } from '@/lib/server/phase-two-data';

import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, Compass, PlaneTakeoff, Stamp } from 'lucide-react';

import { CreateTripForm } from '@/components/forms/create-trip-form';
import { ResponsiveGrid } from '@/components/layout/responsive-grid';
import { ShellPage } from '@/components/layout/shell-page';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { EmptyState } from '@/components/ui/empty-state';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { TripCardTemplate } from '@/components/ui/trip-card-template';
import { useI18n } from '@/hooks/useI18n';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import {
  formatTripDateRange,
  formatTripDuration,
  tripStatusTranslationKeyByValue,
} from '@/lib/utils/trip-display';

interface TripSectionDefinition {
  readonly delay: number;
  readonly description: string;
  readonly eyebrow: string;
  readonly icon: ReactElement;
  readonly title: string;
  readonly trips: readonly TripCard[];
}

export const TripsClientPage = (): ReactElement => {
  const { format, t: tripsT } = useI18n('trips');
  const { t: tripCardT } = useI18n('ui.tripCard');
  const query = useQuery({
    queryFn: appQueryFetchers.trips,
    queryKey: appQueryKeys.trips(),
  });

  if (query.isPending) {
    return (
      <ShellPage
        description={tripsT('header.description')}
        eyebrow={tripsT('header.eyebrow')}
        title={tripsT('header.title')}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        description={tripsT('header.description')}
        eyebrow={tripsT('header.eyebrow')}
        title={tripsT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;
  const totalTrips = data.active.length + data.completed.length + data.planned.length;
  const sections: readonly TripSectionDefinition[] = [
    {
      delay: 0.08,
      description: tripsT('sections.activeDescription'),
      eyebrow: tripsT('sections.activeEyebrow'),
      icon: (
        <PlaneTakeoff
          aria-hidden="true"
          className="size-4"
          strokeWidth={2.2}
        />
      ),
      title: tripsT('sections.activeTitle'),
      trips: data.active,
    },
    {
      delay: 0.12,
      description: tripsT('sections.plannedDescription'),
      eyebrow: tripsT('sections.plannedEyebrow'),
      icon: (
        <Compass
          aria-hidden="true"
          className="size-4"
          strokeWidth={2.2}
        />
      ),
      title: tripsT('sections.plannedTitle'),
      trips: data.planned,
    },
    {
      delay: 0.16,
      description: tripsT('sections.completedDescription'),
      eyebrow: tripsT('sections.completedEyebrow'),
      icon: (
        <Stamp
          aria-hidden="true"
          className="size-4"
          strokeWidth={2.2}
        />
      ),
      title: tripsT('sections.completedTitle'),
      trips: data.completed,
    },
  ];
  const renderTripSection = (section: TripSectionDefinition): ReactElement | null => {
    if (!section.trips.length) {
      return null;
    }

    return (
      <PageReveal delay={section.delay}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              {section.icon}
              <p className="ui-meta">{section.eyebrow}</p>
            </div>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.description}</p>
          </div>

          <ResponsiveGrid
            columns={2}
            density="compact"
          >
            {section.trips.map((trip) => (
              <TripCardTemplate
                badgeLabel={tripCardT(tripStatusTranslationKeyByValue[trip.status])}
                dateRangeLabel={formatTripDateRange(trip, format, tripCardT, data.context.timeZone)}
                eyebrowLabel={tripCardT('eyebrow')}
                href={`/trips/${trip.id}`}
                key={trip.id}
                metaLabel={formatTripDuration(trip, tripCardT)}
                note={trip.note}
                title={trip.title}
              />
            ))}
          </ResponsiveGrid>
        </section>
      </PageReveal>
    );
  };

  return (
    <ShellPage
      description={tripsT('header.description')}
      eyebrow={tripsT('header.eyebrow')}
      title={tripsT('header.title')}
    >
      <PageReveal delay={0.04}>
        <SectionCard
          className="flex flex-col gap-5"
          padding="comfortable"
          surface="glass"
        >
          <div className="space-y-2">
            <p className="ui-meta">{tripsT('composer.eyebrow')}</p>
            <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
              {tripsT('composer.title')}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {tripsT('composer.description')}
            </p>
          </div>
          <CreateTripForm />
        </SectionCard>
      </PageReveal>

      {totalTrips > 0 ? (
        sections.map((section) => renderTripSection(section))
      ) : (
        <PageReveal delay={0.08}>
          <EmptyState
            description={tripsT('empty.description')}
            icon={
              <BriefcaseBusiness
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
            }
            title={tripsT('empty.title')}
          />
        </PageReveal>
      )}

      <PageReveal delay={0.2}>
        <SectionCard
          className="flex flex-col gap-3"
          padding="comfortable"
          surface="paper"
        >
          <div className="flex items-center gap-3">
            <Compass
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth={2.1}
            />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {tripsT('deferred.title')}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {tripsT('deferred.description')}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
