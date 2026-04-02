import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { StatCardTemplate } from "@/components/ui/stat-card-template";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getGameplayStatsPageData } from "@/lib/server/phase-three-data";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";

interface StatsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

const statusTranslationKeyByValue = {
  completed: "status.completed",
  not_started: "status.not_started",
  waiting_for_partner: "status.waiting_for_partner",
  waiting_for_you: "status.waiting_for_you",
} as const;

export const generateMetadata = async ({
  params,
}: StatsPageProps): Promise<Metadata> => getRouteMetadata(params, "stats");

export default async function StatsPage({
  params,
}: StatsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [context, dailyQuestionT, format, statsT] = await Promise.all([
    getReadyCoupleContextOrRedirect(locale),
    getTranslations({
      locale,
      namespace: "dailyQuestion",
    }),
    getFormatter({
      locale,
    }),
    getTranslations({
      locale,
      namespace: "stats",
    }),
  ]);
  const data = await getGameplayStatsPageData(context);

  return (
    <ShellPage
      description={statsT("header.description")}
      eyebrow={statsT("header.eyebrow")}
      title={statsT("header.title")}
    >
      <PageReveal delay={0.04}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCardTemplate
            label={statsT("cards.streak.label")}
            trendLabel={statsT("cards.streak.trend")}
            value={statsT("cards.streak.value", { count: data.currentStreak })}
          />
          <StatCardTemplate
            label={statsT("cards.rounds.label")}
            trendLabel={statsT("cards.rounds.trend")}
            value={format.number(data.totalRounds)}
          />
          <StatCardTemplate
            label={statsT("cards.completed.label")}
            trendLabel={statsT("cards.completed.trend")}
            value={format.number(data.totalCompletedRounds)}
          />
          <StatCardTemplate
            label={statsT("cards.participation.label")}
            trendLabel={statsT("cards.participation.trend", {
              count: data.viewerParticipationCount,
            })}
            value={statsT("cards.participation.value", {
              count: data.viewerParticipationRate,
            })}
          />
        </div>
      </PageReveal>

      <PageReveal delay={0.08}>
        <SectionCard className="flex flex-col gap-4" padding="comfortable" surface="glass">
          <div className="space-y-2">
            <p className="ui-meta">{statsT("history.eyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {statsT("history.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {statsT("history.description")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {data.recentHistory.map((entry) => (
              <ListRow
                action={
                  <Badge variant={entry.status === "completed" ? "primary" : "neutral"}>
                    {dailyQuestionT(statusTranslationKeyByValue[entry.status])}
                  </Badge>
                }
                key={entry.dateToken}
                subtitle={statsT("history.subtitle", {
                  date: format.dateTime(
                    parseDateInputValueInTimeZone(entry.dateToken, context.timezone),
                    {
                      day: "numeric",
                      month: "short",
                      timeZone: context.timezone,
                      year: "numeric",
                    },
                  ),
                })}
                title={statsT("history.rowTitle")}
              />
            ))}
          </div>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
