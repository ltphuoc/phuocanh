import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface TripDetailPageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly tripId: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const generateMetadata = async ({
  params,
}: TripDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "tripDetail");

export default async function TripDetailPage({
  params,
}: TripDetailPageProps): Promise<ReactElement> {
  const [{ tripId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const [tripDetailT, commonT, tripCardT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "tripDetail",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getTranslations({
      locale,
      namespace: "ui.tripCard",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);
  const tripLabel = formatSegmentLabel(tripId) || tripDetailT("fallbackTripLabel");

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
      description={tripDetailT("header.description")}
      eyebrow={tripDetailT("header.eyebrow")}
      title={tripLabel}
    >
      <ResponsiveGrid columns={2}>
        <TripCardTemplate
          badgeLabel={tripCardT("badge")}
          destination={tripLabel}
          durationLabel={tripDetailT("durationPlaceholder")}
          eyebrowLabel={tripCardT("eyebrow")}
          itemCountLabel={tripDetailT("itemsPlaceholder")}
        />
        <SectionCard className="flex flex-col gap-3" padding="comfortable" tone="muted">
          <p className="ui-heading-lg">{tripDetailT("plannedSectionsTitle")}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>{tripDetailT("plannedSections.highlights")}</li>
            <li>{tripDetailT("plannedSections.timeline")}</li>
            <li>{tripDetailT("plannedSections.albums")}</li>
          </ul>
        </SectionCard>
      </ResponsiveGrid>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/map"
        ctaLabel={tripDetailT("comingSoon.cta")}
        description={tripDetailT("comingSoon.description")}
        title={tripDetailT("comingSoon.title")}
      />
    </ShellPage>
  );
}
