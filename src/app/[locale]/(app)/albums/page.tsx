import { Album, MapPinned } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { AlbumCard } from "@/components/ui/album-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getAlbumsPageData } from "@/lib/server/phase-two-data";
import { formatTripDateRange } from "@/lib/utils/trip-display";

interface AlbumsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: AlbumsPageProps): Promise<Metadata> => getRouteMetadata(params, "albums");

export default async function AlbumsPage({
  params,
}: AlbumsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [albumsT, albumCardT, tripCardT, commonT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "albums",
    }),
    getTranslations({
      locale,
      namespace: "ui.albumCard",
    }),
    getTranslations({
      locale,
      namespace: "ui.tripCard",
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
  const data = await getAlbumsPageData(context);

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
      description={albumsT("header.description")}
      eyebrow={albumsT("header.eyebrow")}
      title={albumsT("header.title")}
    >
      {data.albums.length ? (
        <PageReveal delay={0.04}>
          <ResponsiveGrid columns={2} density="compact">
            {data.albums.map((album) => (
              <AlbumCard
                coverMediaType={album.coverMediaType}
                coverSignedUrl={album.coverSignedUrl}
                description={album.description}
                href={`/albums/${album.id}`}
                itemCountLabel={albumCardT("itemCount", { count: album.itemCount })}
                key={album.id}
                title={album.title}
                tripDateRangeLabel={formatTripDateRange(album.trip, format, tripCardT)}
                tripTitle={album.trip.title}
                videoCoverLabel={albumCardT("videoCoverLabel")}
              />
            ))}
          </ResponsiveGrid>
        </PageReveal>
      ) : (
        <PageReveal delay={0.04}>
          <EmptyState
            description={albumsT("empty.description")}
            icon={<Album aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={albumsT("empty.title")}
          />
        </PageReveal>
      )}

      <PageReveal delay={0.1}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
          <div className="flex items-center gap-3">
            <MapPinned aria-hidden="true" className="size-5 text-primary" strokeWidth={2.1} />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {albumsT("deferred.title")}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {albumsT("deferred.description")}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
