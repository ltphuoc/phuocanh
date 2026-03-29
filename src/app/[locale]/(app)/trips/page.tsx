import { BriefcaseBusiness } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface TripsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: TripsPageProps): Promise<Metadata> => getRouteMetadata(params, "trips");

export default async function TripsPage({
  params,
}: TripsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [tripsT, tripCardT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "trips",
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

  return (
    <ShellPage
      description={tripsT("header.description")}
      eyebrow={tripsT("header.eyebrow")}
      title={tripsT("header.title")}
    >
      <ResponsiveGrid columns={2}>
        <TripCardTemplate
          badgeLabel={tripCardT("badge")}
          destination={tripsT("templates.dalat.destination")}
          durationLabel={tripsT("templates.dalat.duration")}
          eyebrowLabel={tripCardT("eyebrow")}
          itemCountLabel={tripsT("templates.dalat.items")}
        />
        <TripCardTemplate
          badgeLabel={tripCardT("badge")}
          destination={tripsT("templates.hoian.destination")}
          durationLabel={tripsT("templates.hoian.duration")}
          eyebrowLabel={tripCardT("eyebrow")}
          itemCountLabel={tripsT("templates.hoian.items")}
        />
        <ComingSoonCard
          badgeLabel={comingSoonCardT("badge")}
          ctaHref="/albums/featured"
          ctaLabel={tripsT("comingSoon.cta")}
          description={tripsT("comingSoon.description")}
          title={tripsT("comingSoon.title")}
        />
        <SectionCard className="flex flex-col justify-center" padding="comfortable">
          <EmptyState
            description={tripsT("empty.description")}
            icon={<BriefcaseBusiness aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={tripsT("empty.title")}
          />
        </SectionCard>
      </ResponsiveGrid>
    </ShellPage>
  );
}
