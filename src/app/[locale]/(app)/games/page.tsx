import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { GameCardTemplate } from "@/components/ui/game-card-template";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface GamesPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: GamesPageProps): Promise<Metadata> => getRouteMetadata(params, "games");

export default async function GamesPage({
  params,
}: GamesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [gamesT, commonT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "games",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);

  return (
    <ShellPage
      description={gamesT("header.description")}
      eyebrow={gamesT("header.eyebrow")}
      title={gamesT("header.title")}
    >
      <ResponsiveGrid columns={2}>
        <GameCardTemplate
          ctaLabel={gamesT("cards.guess.cta")}
          description={gamesT("cards.guess.description")}
          title={gamesT("cards.guess.title")}
          trailing={
            <Link
              className="inline-flex h-9 items-center rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted-soft"
              href="/games/guess-date"
            >
              {commonT("openShell")}
            </Link>
          }
        />
        <GameCardTemplate
          ctaLabel={gamesT("cards.daily.cta")}
          description={gamesT("cards.daily.description")}
          title={gamesT("cards.daily.title")}
          trailing={
            <Link
              className="inline-flex h-9 items-center rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted-soft"
              href="/games/daily-question"
            >
              {commonT("openShell")}
            </Link>
          }
        />
      </ResponsiveGrid>

      <SectionCard className="text-sm text-muted-foreground" padding="comfortable" tone="muted">
        {gamesT("presentationalNote")}
      </SectionCard>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/stats"
        ctaLabel={gamesT("comingSoon.cta")}
        description={gamesT("comingSoon.description")}
        title={gamesT("comingSoon.title")}
      />
    </ShellPage>
  );
}
