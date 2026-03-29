import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { TravelAtlasShell } from "@/components/ui/travel-atlas-shell";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getMapPageData } from "@/lib/server/phase-two-data";

interface MapPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: MapPageProps): Promise<Metadata> => getRouteMetadata(params, "map");

export default async function MapPage({
  params,
}: MapPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [commonT, mapT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "common",
    }),
    getTranslations({
      locale,
      namespace: "map",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const data = await getMapPageData(context);

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
      description={mapT("header.description")}
      eyebrow={mapT("header.eyebrow")}
      quote={mapT("header.quote")}
      title={mapT("header.title")}
    >
      <PageReveal>
        {data.visitedPlaces.length ? (
          <TravelAtlasShell groups={data.trips} timeZone={context.timezone} />
        ) : (
          <EmptyState
            action={
              <Link
                className="inline-flex h-11 items-center rounded-pill border border-white/70 bg-white/68 px-5 text-sm font-semibold text-foreground shadow-whisper transition-colors hover:bg-white/85"
                href="/trips"
              >
                {mapT("empty.cta")}
              </Link>
            }
            description={mapT("empty.description")}
            title={mapT("empty.title")}
          />
        )}
      </PageReveal>
    </ShellPage>
  );
}
