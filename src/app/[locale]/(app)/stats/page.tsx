import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { StatCardTemplate } from "@/components/ui/stat-card-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface StatsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: StatsPageProps): Promise<Metadata> => getRouteMetadata(params, "stats");

export default async function StatsPage({
  params,
}: StatsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [statsT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "stats",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);

  return (
    <ShellPage
      description={statsT("header.description")}
      eyebrow={statsT("header.eyebrow")}
      title={statsT("header.title")}
    >
      <ResponsiveGrid columns={3} density="compact">
        <StatCardTemplate
          label={statsT("cards.memories.label")}
          trendLabel={statsT("cards.memories.trend")}
          value={statsT("cards.memories.value")}
        />
        <StatCardTemplate
          label={statsT("cards.streak.label")}
          trendLabel={statsT("cards.streak.trend")}
          value={statsT("cards.streak.value")}
        />
        <StatCardTemplate
          label={statsT("cards.trips.label")}
          trendLabel={statsT("cards.trips.trend")}
          value={statsT("cards.trips.value")}
        />
      </ResponsiveGrid>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/games"
        ctaLabel={statsT("comingSoon.cta")}
        description={statsT("comingSoon.description")}
        title={statsT("comingSoon.title")}
      />
    </ShellPage>
  );
}
