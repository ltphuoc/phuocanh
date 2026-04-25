"use client";

import { Album, MapPinned } from "lucide-react";
import { parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import type { ReactElement } from "react";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { SectionStack } from "@/components/layout/section-stack";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { AlbumCard } from "@/components/ui/album-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { formatTripDateRange, formatTripDuration } from "@/lib/utils/trip-display";

interface AlbumDetailClientPageProps {
  readonly albumId: string;
}

interface MediaTileItem {
  readonly happenedAt: string;
  readonly locationName: string | null;
  readonly mediaType: "image" | "video";
  readonly note: string | null;
  readonly signedUrl: string | null;
}

export const AlbumDetailClientPage = ({
  albumId,
}: AlbumDetailClientPageProps): ReactElement => {
  const { format, t: albumDetailT } = useI18n("albumDetail");
  const { t: albumCardT } = useI18n("ui.albumCard");
  const { t: tripCardT } = useI18n("ui.tripCard");
  const query = useQuery({
    queryFn: () => appQueryFetchers.album(albumId),
    queryKey: appQueryKeys.album(albumId),
  });

  const renderMediaTile = (item: MediaTileItem, timeZone: string): ReactElement => {
    const happenedAt = parseISO(item.happenedAt);
    const happenedAtLabel = Number.isNaN(happenedAt.getTime())
      ? item.happenedAt
      : format.dateTime(happenedAt, {
          day: "numeric",
          month: "short",
          timeZone,
          year: "numeric",
        });

    return (
      <div className="flex flex-col gap-4 rounded-[1.7rem] border border-white/70 bg-white/72 p-4 shadow-whisper">
        {item.mediaType === "image" && item.signedUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] border border-white/70 shadow-whisper">
            <Image
              alt={item.note?.trim() || albumDetailT("mediaAlt")}
              className="object-cover"
              fill
              sizes="(min-width: 1280px) 24vw, (min-width: 768px) 36vw, 100vw"
              src={item.signedUrl}
              unoptimized
            />
          </div>
        ) : item.mediaType === "video" && item.signedUrl ? (
          <video
            className="aspect-[4/3] w-full rounded-[1.4rem] border border-white/70 bg-black/80 object-cover shadow-whisper"
            controls
            preload="metadata"
            src={item.signedUrl}
          />
        ) : (
          <EmptyState
            description={albumDetailT("mediaUnavailableDescription")}
            icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={albumDetailT("mediaUnavailableTitle")}
          />
        )}

        <div className="space-y-2">
          <p className="ui-meta">{happenedAtLabel}</p>
          <p className="text-sm leading-relaxed text-foreground">
            {item.note?.trim() || albumDetailT("mediaNoteFallback")}
          </p>
          {item.locationName ? (
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              {item.locationName}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

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

  const { album, context } = query.data;
  const tripDateRangeLabel = formatTripDateRange(
    album.trip,
    format,
    tripCardT,
    context.timeZone,
  );
  const tripDurationLabel = formatTripDuration(album.trip, tripCardT);
  const albumItemCountLabel = albumCardT("itemCount", { count: album.items.length });
  const coverItem = album.items[0] ?? null;

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href={`/trips/${album.trip.id}`}
        >
          {albumDetailT("backToTrip")}
        </Link>
      }
      description={albumDetailT("header.description", {
        dateRange: tripDateRangeLabel,
        itemCount: albumItemCountLabel,
        tripTitle: album.trip.title,
      })}
      eyebrow={albumDetailT("header.eyebrow")}
      title={album.title}
    >
      <PageReveal delay={0.04}>
        <ResponsiveGrid columns={2}>
          <AlbumCard
            coverMediaType={coverItem?.mediaType ?? null}
            coverSignedUrl={coverItem?.signedUrl ?? null}
            description={album.description}
            itemCountLabel={albumItemCountLabel}
            title={album.title}
            tripDateRangeLabel={tripDateRangeLabel}
            tripTitle={album.trip.title}
            videoCoverLabel={albumCardT("videoCoverLabel")}
          />
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
            <div className="space-y-2">
              <p className="ui-meta">{albumDetailT("summaryEyebrow")}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {albumDetailT("summaryTitle")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {album.description?.trim() || albumDetailT("summaryEmpty")}
            </p>
            <div className="rounded-[1.4rem] border border-white/70 bg-white/72 p-4 shadow-whisper">
              <p className="ui-meta">{albumDetailT("tripLabel")}</p>
              <p className="mt-2 font-display text-[1.5rem] tracking-[-0.03em] text-foreground">
                {album.trip.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{tripDateRangeLabel}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {tripDurationLabel}
              </p>
            </div>
          </SectionCard>
        </ResponsiveGrid>
      </PageReveal>

      <PageReveal delay={0.08}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
          <div className="space-y-2">
            <p className="ui-meta">{albumDetailT("mediaEyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {albumDetailT("mediaTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {albumDetailT("mediaDescription")}
            </p>
          </div>

          {album.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {album.items.map((item) => (
                <div key={item.id}>
                  {renderMediaTile(item, context.timeZone)}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description={albumDetailT("empty.description")}
              icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
              title={albumDetailT("empty.title")}
            />
          )}
        </SectionCard>
      </PageReveal>

      <PageReveal delay={0.12}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
          <div className="flex items-center gap-3">
            <MapPinned aria-hidden="true" className="size-5 text-primary" strokeWidth={2.1} />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {albumDetailT("deferredTitle")}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {albumDetailT("deferredDescription")}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
