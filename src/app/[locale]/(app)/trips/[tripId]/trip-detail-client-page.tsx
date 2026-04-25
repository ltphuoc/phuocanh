"use client";

import { Album, MapPinned, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { AddAlbumItemsForm } from "@/components/forms/add-album-items-form";
import { CreateAlbumForm } from "@/components/forms/create-album-form";
import { CreateVisitedPlaceForm } from "@/components/forms/create-visited-place-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { SectionStack } from "@/components/layout/section-stack";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { AlbumCard } from "@/components/ui/album-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";
import {
  formatTripDateRange,
  formatTripDuration,
  tripStatusTranslationKeyByValue,
} from "@/lib/utils/trip-display";

interface TripDetailClientPageProps {
  readonly tripId: string;
}

export const TripDetailClientPage = ({
  tripId,
}: TripDetailClientPageProps): ReactElement => {
  const { t: albumCardT } = useI18n("ui.albumCard");
  const { t: commonT } = useI18n("common");
  const { format, t: tripDetailT } = useI18n("tripDetail");
  const { t: tripCardT } = useI18n("ui.tripCard");
  const query = useQuery({
    queryFn: () => appQueryFetchers.trip(tripId),
    queryKey: appQueryKeys.trip(tripId),
  });
  const action = (
    <Link
      className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
      href="/trips"
    >
      {commonT("backToTrips")}
    </Link>
  );

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

  const { context, trip } = query.data;
  const timeZone = context.timeZone;
  const dateRangeLabel = formatTripDateRange(trip, format, tripCardT, timeZone);
  const durationLabel = formatTripDuration(trip, tripCardT);
  const statusLabel = tripCardT(tripStatusTranslationKeyByValue[trip.status]);
  const albumItemCountLabel = trip.album
    ? albumCardT("itemCount", { count: trip.album.itemCount })
    : null;
  const formatVisitedPlaceDate = (visitedOn: string): string =>
    format.dateTime(parseDateInputValueInTimeZone(visitedOn, timeZone), {
      day: "numeric",
      month: "short",
      timeZone,
      year: "numeric",
    });

  return (
    <ShellPage
      action={action}
      description={tripDetailT("header.description", {
        dateRange: dateRangeLabel,
        duration: durationLabel,
        status: statusLabel,
      })}
      eyebrow={tripDetailT("header.eyebrow")}
      title={trip.title}
    >
      <PageReveal delay={0.04}>
        <ResponsiveGrid columns={2}>
          <TripCardTemplate
            badgeLabel={statusLabel}
            dateRangeLabel={dateRangeLabel}
            eyebrowLabel={tripCardT("eyebrow")}
            metaLabel={durationLabel}
            note={trip.note}
            title={trip.title}
          />
          <SectionCard className="flex flex-col gap-4" padding="comfortable" surface="paper">
            <div className="space-y-2">
              <p className="ui-meta">{tripDetailT("noteEyebrow")}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {tripDetailT("noteTitle")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {trip.note?.trim() || tripDetailT("noteEmpty")}
            </p>
          </SectionCard>
        </ResponsiveGrid>
      </PageReveal>

      {trip.album && albumItemCountLabel ? (
        <PageReveal delay={0.1}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Album aria-hidden="true" className="size-4" strokeWidth={2.2} />
                <p className="ui-meta">{tripDetailT("albumLinkedEyebrow")}</p>
              </div>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {tripDetailT("albumLinkedTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tripDetailT("albumLinkedDescription")}
              </p>
            </div>

            <ResponsiveGrid columns={2}>
              <AlbumCard
                coverMediaType={trip.album.coverMediaType}
                coverSignedUrl={trip.album.coverSignedUrl}
                description={trip.album.description}
                href={`/albums/${trip.album.id}`}
                itemCountLabel={albumItemCountLabel}
                title={trip.album.title}
                tripDateRangeLabel={dateRangeLabel}
                tripTitle={trip.title}
                videoCoverLabel={albumCardT("videoCoverLabel")}
              />

              <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
                    <p className="ui-meta">{tripDetailT("albumAddEyebrow")}</p>
                  </div>
                  <h3 className="font-display text-[1.75rem] tracking-[-0.03em] text-foreground">
                    {trip.availableMedia.length
                      ? tripDetailT("albumAddTitle")
                      : tripDetailT("albumGroupedTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {trip.availableMedia.length
                      ? tripDetailT("albumAddDescription")
                      : tripDetailT("albumGroupedDescription")}
                  </p>
                </div>

                {trip.availableMedia.length ? (
                  <AddAlbumItemsForm
                    albumId={trip.album.id}
                    candidates={trip.availableMedia}
                    timeZone={timeZone}
                    tripId={trip.id}
                  />
                ) : (
                  <EmptyState
                    description={tripDetailT("albumGroupedDescription")}
                    icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                    title={tripDetailT("albumGroupedTitle")}
                  />
                )}
              </SectionCard>
            </ResponsiveGrid>
          </SectionCard>
        </PageReveal>
      ) : trip.availableMedia.length ? (
        <PageReveal delay={0.1}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Album aria-hidden="true" className="size-4" strokeWidth={2.2} />
                <p className="ui-meta">{tripDetailT("albumComposerEyebrow")}</p>
              </div>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {tripDetailT("albumComposerTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tripDetailT("albumComposerDescription")}
              </p>
            </div>
            <CreateAlbumForm candidates={trip.availableMedia} timeZone={timeZone} tripId={trip.id} />
          </SectionCard>
        </PageReveal>
      ) : (
        <PageReveal delay={0.1}>
          <EmptyState
            description={tripDetailT("albumEmptyDescription")}
            icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={tripDetailT("albumEmptyTitle")}
          />
        </PageReveal>
      )}

      <PageReveal delay={0.14}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <MapPinned aria-hidden="true" className="size-4" strokeWidth={2.1} />
              <p className="ui-meta">{tripDetailT("placesEyebrow")}</p>
            </div>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {tripDetailT("placesTitle")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {tripDetailT("placesDescription")}
            </p>
          </div>

          <ResponsiveGrid columns={2}>
            <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
              <div className="space-y-2">
                <p className="ui-meta">{tripDetailT("placesComposerEyebrow")}</p>
                <h3 className="font-display text-[1.75rem] tracking-[-0.03em] text-foreground">
                  {tripDetailT("placesComposerTitle")}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tripDetailT("placesComposerDescription")}
                </p>
              </div>
              <CreateVisitedPlaceForm
                endDate={trip.endDate}
                startDate={trip.startDate}
                tripId={trip.id}
              />
            </SectionCard>

            {trip.visitedPlaces.length ? (
              <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
                <div className="space-y-2">
                  <p className="ui-meta">{tripDetailT("placesListEyebrow")}</p>
                  <h3 className="font-display text-[1.75rem] tracking-[-0.03em] text-foreground">
                    {tripDetailT("placesListTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {tripDetailT("placesListDescription")}
                  </p>
                </div>
                <div className="space-y-3">
                  {trip.visitedPlaces.map((visitedPlace) => (
                    <ListRow
                      key={visitedPlace.id}
                      meta={
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {visitedPlace.note?.trim() || tripDetailT("placesNoteFallback")}
                        </p>
                      }
                      subtitle={tripDetailT("placesVisitedOn", {
                        date: formatVisitedPlaceDate(visitedPlace.visitedOn),
                      })}
                      title={visitedPlace.title}
                    />
                  ))}
                </div>
              </SectionCard>
            ) : (
              <EmptyState
                description={tripDetailT("placesEmptyDescription")}
                icon={<MapPinned aria-hidden="true" className="size-4" strokeWidth={2.1} />}
                title={tripDetailT("placesEmptyTitle")}
              />
            )}
          </ResponsiveGrid>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
