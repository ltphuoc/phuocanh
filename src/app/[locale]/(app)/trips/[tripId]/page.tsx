import { Album, MapPinned, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { AddAlbumItemsForm } from "@/components/forms/add-album-items-form";
import { CreateAlbumForm } from "@/components/forms/create-album-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { AlbumCard } from "@/components/ui/album-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getTripDetailData } from "@/lib/server/phase-two-data";
import {
  formatTripDateRange,
  formatTripDuration,
  tripStatusTranslationKeyByValue,
} from "@/lib/utils/trip-display";

interface TripDetailPageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly tripId: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: TripDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "tripDetail");

export default async function TripDetailPage({
  params,
}: TripDetailPageProps): Promise<ReactElement> {
  const [{ tripId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const [tripDetailT, tripCardT, albumCardT, commonT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "tripDetail",
    }),
    getTranslations({
      locale,
      namespace: "ui.tripCard",
    }),
    getTranslations({
      locale,
      namespace: "ui.albumCard",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const format = await getFormatter({
    locale,
  });
  const trip = await getTripDetailData(context, tripId);

  if (!trip) {
    notFound();
  }

  const dateRangeLabel = formatTripDateRange(trip, format, tripCardT);
  const durationLabel = formatTripDuration(trip, tripCardT);
  const statusLabel = tripCardT(tripStatusTranslationKeyByValue[trip.status]);
  const albumItemCountLabel = trip.album
    ? albumCardT("itemCount", { count: trip.album.itemCount })
    : null;

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/trips"
        >
          {commonT("backToTrips")}
        </Link>
      }
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
            <CreateAlbumForm candidates={trip.availableMedia} tripId={trip.id} />
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
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
          <div className="flex items-center gap-3">
            <MapPinned aria-hidden="true" className="size-5 text-primary" strokeWidth={2.1} />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {tripDetailT("placesDeferredTitle")}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {tripDetailT("placesDeferredDescription")}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
