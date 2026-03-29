import { Album, MapPinned } from "lucide-react";
import { parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { AlbumCard } from "@/components/ui/album-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getAlbumDetailData } from "@/lib/server/phase-two-data";
import { formatTripDateRange, formatTripDuration } from "@/lib/utils/trip-display";

interface AlbumDetailPageProps {
  readonly params: Promise<{
    readonly albumId: string;
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: AlbumDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "albumDetail");

const renderMediaTile = (
  item: {
    readonly happenedAt: string;
    readonly locationName: string | null;
    readonly mediaType: "image" | "video";
    readonly note: string | null;
    readonly signedUrl: string | null;
  },
  format: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations<"albumDetail">>>,
  timeZone: string,
): ReactElement => {
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
            alt={item.note?.trim() || t("mediaAlt")}
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
          description={t("mediaUnavailableDescription")}
          icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          title={t("mediaUnavailableTitle")}
        />
      )}

      <div className="space-y-2">
        <p className="ui-meta">{happenedAtLabel}</p>
        <p className="text-sm leading-relaxed text-foreground">
          {item.note?.trim() || t("mediaNoteFallback")}
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

export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps): Promise<ReactElement> {
  const [{ albumId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const [albumDetailT, albumCardT, tripCardT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "albumDetail",
    }),
    getTranslations({
      locale,
      namespace: "ui.albumCard",
    }),
    getTranslations({
      locale,
      namespace: "ui.tripCard",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const format = await getFormatter({
    locale,
  });
  const album = await getAlbumDetailData(context, albumId);

  if (!album) {
    notFound();
  }

  const tripDateRangeLabel = formatTripDateRange(album.trip, format, tripCardT, context.timezone);
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
                  {renderMediaTile(item, format, albumDetailT, context.timezone)}
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
}
