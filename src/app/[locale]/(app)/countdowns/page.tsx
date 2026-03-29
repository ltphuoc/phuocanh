import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { CountdownWidgetTemplate } from "@/components/ui/countdown-widget-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface CountdownsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: CountdownsPageProps): Promise<Metadata> => getRouteMetadata(params, "countdowns");

export default async function CountdownsPage({
  params,
}: CountdownsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [countdownsT, countdownUiT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "countdowns",
    }),
    getTranslations({
      locale,
      namespace: "ui.countdown",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);

  return (
    <ShellPage
      description={countdownsT("header.description")}
      eyebrow={countdownsT("header.eyebrow")}
      title={countdownsT("header.title")}
    >
      <ResponsiveGrid columns={2} density="compact">
        <CountdownWidgetTemplate
          daysLeftLabel={countdownUiT("daysLeft", { count: 9 })}
          eventName={countdownsT("items.anniversaryDinner.name")}
          eventType={countdownsT("items.anniversaryDinner.type")}
          remainingLabel={countdownUiT("remaining")}
        />
        <CountdownWidgetTemplate
          daysLeftLabel={countdownUiT("daysLeft", { count: 25 })}
          eventName={countdownsT("items.birthday.name")}
          eventType={countdownsT("items.birthday.type")}
          remainingLabel={countdownUiT("remaining")}
        />
        <CountdownWidgetTemplate
          daysLeftLabel={countdownUiT("daysLeft", { count: 42 })}
          eventName={countdownsT("items.danangTrip.name")}
          eventType={countdownsT("items.danangTrip.type")}
          remainingLabel={countdownUiT("remaining")}
        />
        <CountdownWidgetTemplate
          daysLeftLabel={countdownUiT("daysLeft", { count: 77 })}
          eventName={countdownsT("items.staycation.name")}
          eventType={countdownsT("items.staycation.type")}
          remainingLabel={countdownUiT("remaining")}
        />
      </ResponsiveGrid>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/future-notes"
        ctaLabel={countdownsT("comingSoon.cta")}
        description={countdownsT("comingSoon.description")}
        title={countdownsT("comingSoon.title")}
      />
    </ShellPage>
  );
}
