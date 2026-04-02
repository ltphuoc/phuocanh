import { Sparkles, WandSparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { Badge } from "@/components/ui/badge";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getGamesHubData } from "@/lib/server/phase-three-data";

interface GamesPageProps {
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

const localeTranslationKeyByValue: Record<Locale, "locale.en" | "locale.vi"> = {
  en: "locale.en",
  vi: "locale.vi",
};

export const generateMetadata = async ({
  params,
}: GamesPageProps): Promise<Metadata> => getRouteMetadata(params, "games");

export default async function GamesPage({
  params,
}: GamesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [context, dailyQuestionT, gamesT] = await Promise.all([
    getReadyCoupleContextOrRedirect(locale),
    getTranslations({
      locale,
      namespace: "dailyQuestion",
    }),
    getTranslations({
      locale,
      namespace: "games",
    }),
  ]);
  const data = await getGamesHubData(context);
  const dailyQuestionCtaLabel = data.dailyQuestion
    ? gamesT("dailyQuestion.openCta")
    : gamesT("dailyQuestion.generateCta");
  const dailyQuestionSummary = data.dailyQuestion
    ? gamesT("dailyQuestion.readySummary", {
        count: data.dailyQuestion.answerCount,
      })
    : gamesT("dailyQuestion.emptySummary");

  return (
    <ShellPage
      description={gamesT("header.description")}
      eyebrow={gamesT("header.eyebrow")}
      title={gamesT("header.title")}
    >
      <ResponsiveGrid columns={2}>
        <PageReveal delay={0.04}>
          <SectionCard className="flex h-full flex-col gap-5" padding="comfortable" surface="glass">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  <p className="ui-meta">{gamesT("dailyQuestion.eyebrow")}</p>
                </div>
                <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
                  {gamesT("dailyQuestion.title")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gamesT("dailyQuestion.description")}
                </p>
              </div>
              <Badge variant="primary">
                {dailyQuestionT(
                  statusTranslationKeyByValue[data.dailyQuestion?.status ?? "not_started"],
                )}
              </Badge>
            </div>

            <div className="rounded-[1.5rem] border border-white/65 bg-white/72 px-4 py-4 shadow-whisper backdrop-blur-md">
              <p className="text-sm font-semibold text-foreground">{dailyQuestionSummary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.dailyQuestion
                  ? gamesT("dailyQuestion.promptLocale", {
                      locale: dailyQuestionT(
                        localeTranslationKeyByValue[data.dailyQuestion.promptLocale],
                      ),
                    })
                  : gamesT("dailyQuestion.generateHint")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-pill ui-gradient-active px-5 text-sm font-semibold text-primary-foreground shadow-cloud transition-all duration-200 hover:-translate-y-0.5 hover:brightness-102"
                href="/games/daily-question"
              >
                {dailyQuestionCtaLabel}
              </Link>
              <p className="text-xs text-muted-foreground">{gamesT("dailyQuestion.onlyLiveMode")}</p>
            </div>
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.08}>
          <SectionCard className="flex h-full flex-col gap-5" padding="comfortable" surface="paper">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <WandSparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  <p className="ui-meta">{gamesT("guessDate.eyebrow")}</p>
                </div>
                <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
                  {gamesT("guessDate.title")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gamesT("guessDate.description")}
                </p>
              </div>
              <Badge>{gamesT("shellBadge")}</Badge>
            </div>

            <p className="rounded-[1.5rem] border border-white/65 bg-white/72 px-4 py-4 text-sm text-muted-foreground shadow-whisper backdrop-blur-md">
              {gamesT("guessDate.shellSummary")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-pill border border-white/72 bg-white/78 px-5 text-sm font-semibold text-foreground shadow-whisper transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/92"
                href="/games/guess-date"
              >
                {gamesT("guessDate.cta")}
              </Link>
              <p className="text-xs text-muted-foreground">{gamesT("guessDate.deferredNote")}</p>
            </div>
          </SectionCard>
        </PageReveal>
      </ResponsiveGrid>

      <PageReveal delay={0.12}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="petal">
          <p className="ui-meta">{gamesT("statsBridge.eyebrow")}</p>
          <h2 className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
            {gamesT("statsBridge.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {gamesT("statsBridge.description")}
          </p>
          <div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-pill border border-white/72 bg-white/78 px-4 text-sm font-semibold text-foreground shadow-whisper transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/92"
              href="/stats"
            >
              {gamesT("statsBridge.cta")}
            </Link>
          </div>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
