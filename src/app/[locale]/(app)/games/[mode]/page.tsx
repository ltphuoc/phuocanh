import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { GenerateDailyQuestionForm } from "@/components/forms/generate-daily-question-form";
import { SubmitDailyQuestionAnswerForm } from "@/components/forms/submit-daily-question-answer-form";
import { ShellPage } from "@/components/layout/shell-page";
import { Badge } from "@/components/ui/badge";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getDailyQuestionPageData } from "@/lib/server/phase-three-data";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";

interface GameModePageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly mode: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const statusTranslationKeyByValue = {
  completed: "status.completed",
  not_started: "status.not_started",
  waiting_for_partner: "status.waiting_for_partner",
  waiting_for_you: "status.waiting_for_you",
} as const;

const statusNoteTranslationKeyByValue = {
  completed: "statusNote.copy.completed",
  not_started: "statusNote.copy.not_started",
  waiting_for_partner: "statusNote.copy.waiting_for_partner",
  waiting_for_you: "statusNote.copy.waiting_for_you",
} as const;

const localeTranslationKeyByValue = {
  en: "locale.en",
  vi: "locale.vi",
} as const;

const answerAuthorTranslationKeyByValue = {
  partner: "answers.partner",
  viewer: "answers.viewer",
} as const;

export const generateMetadata = async ({
  params,
}: GameModePageProps): Promise<Metadata> => getRouteMetadata(params, "gameMode");

const renderShellModePage = async (
  locale: Locale,
  mode: string,
): Promise<ReactElement> => {
  const [gameModeT, commonT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "gameMode",
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
  const modeLabel = formatSegmentLabel(mode) || gameModeT("fallbackModeLabel");

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/games"
        >
          {commonT("backToGames")}
        </Link>
      }
      description={gameModeT("header.description")}
      eyebrow={gameModeT("header.eyebrow")}
      title={modeLabel}
    >
      <SectionCard className="flex min-h-56 items-center justify-center" padding="comfortable" tone="muted">
        <p className="max-w-lg text-center text-sm text-muted-foreground">{gameModeT("placeholder")}</p>
      </SectionCard>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/games"
        ctaLabel={gameModeT("comingSoon.cta")}
        description={gameModeT("comingSoon.description")}
        title={gameModeT("comingSoon.title")}
      />
    </ShellPage>
  );
};

const renderDailyQuestionPage = async (locale: Locale): Promise<ReactElement> => {
  const [context, commonT, dailyQuestionT, format] = await Promise.all([
    getReadyCoupleContextOrRedirect(locale),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getTranslations({
      locale,
      namespace: "dailyQuestion",
    }),
    getFormatter({
      locale,
    }),
  ]);
  const data = await getDailyQuestionPageData(context);
  const roundDateLabel = data.round
    ? format.dateTime(parseDateInputValueInTimeZone(data.round.roundDate, context.timezone), {
        day: "numeric",
        month: "short",
        timeZone: context.timezone,
        year: "numeric",
      })
    : data.todayDateToken;

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/games"
        >
          {commonT("backToGames")}
        </Link>
      }
      description={dailyQuestionT("header.description")}
      eyebrow={dailyQuestionT("header.eyebrow")}
      title={dailyQuestionT("header.title")}
    >
      <PageReveal delay={0.04}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="hero">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
                <p className="ui-meta text-primary-foreground/80">{dailyQuestionT("round.eyebrow")}</p>
              </div>
              <h2 className="font-display text-[2rem] tracking-[-0.03em] text-primary-foreground">
                {data.round ? dailyQuestionT("round.title") : dailyQuestionT("intro.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-primary-foreground/82">
                {data.round
                  ? dailyQuestionT("round.description")
                  : dailyQuestionT("intro.description")}
              </p>
            </div>
            <Badge variant="primary">
              {dailyQuestionT(
                statusTranslationKeyByValue[data.round?.status ?? "not_started"],
              )}
            </Badge>
          </div>

          {data.round ? (
            <div className="space-y-4 rounded-[1.7rem] border border-white/35 bg-white/18 px-5 py-5 text-primary-foreground shadow-cloud backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.08em] text-primary-foreground/75">
                <span>{dailyQuestionT("round.date", { date: roundDateLabel })}</span>
                <span>
                  {dailyQuestionT("round.locale", {
                    locale: dailyQuestionT(localeTranslationKeyByValue[data.round.promptLocale]),
                  })}
                </span>
                <span>{dailyQuestionT("round.answerCount", { count: data.round.answerCount })}</span>
              </div>
              <p className="font-display text-[2rem] leading-tight tracking-[-0.03em] text-primary-foreground">
                {data.round.promptText}
              </p>
            </div>
          ) : (
            <GenerateDailyQuestionForm />
          )}
        </SectionCard>
      </PageReveal>

      {data.round && !data.round.viewerHasAnswered ? (
        <PageReveal delay={0.08}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
            <div className="space-y-2">
              <p className="ui-meta">{dailyQuestionT("composer.eyebrow")}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {dailyQuestionT("composer.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {dailyQuestionT("composer.description")}
              </p>
            </div>
            <SubmitDailyQuestionAnswerForm roundId={data.round.id} />
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round && data.round.viewerHasAnswered && !data.round.revealAnswers ? (
        <PageReveal delay={0.12}>
          <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
            <p className="ui-meta">{dailyQuestionT("pending.eyebrow")}</p>
            <h2 className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
              {dailyQuestionT("pending.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {dailyQuestionT("pending.viewerLocked")}
            </p>
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round?.revealAnswers ? (
        <PageReveal delay={0.16}>
          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="ui-meta">{dailyQuestionT("reveal.eyebrow")}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {dailyQuestionT("reveal.title")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {dailyQuestionT("reveal.description")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.round.revealedAnswers.map((answer) => (
                <SectionCard
                  key={`${answer.author}-${answer.submittedAt}`}
                  padding="comfortable"
                  surface="paper"
                >
                  <div className="flex flex-col gap-3">
                    <Badge variant={answer.author === "viewer" ? "primary" : "neutral"}>
                      {dailyQuestionT(answerAuthorTranslationKeyByValue[answer.author])}
                    </Badge>
                    <p className="text-sm leading-relaxed text-foreground">{answer.answerBody}</p>
                  </div>
                </SectionCard>
              ))}
            </div>
          </section>
        </PageReveal>
      ) : null}

      <PageReveal delay={0.2}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="petal">
          <p className="ui-meta">{dailyQuestionT("statusNote.eyebrow")}</p>
          <h2 className="font-display text-[1.7rem] tracking-[-0.03em] text-foreground">
            {dailyQuestionT("statusNote.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {dailyQuestionT(
              statusNoteTranslationKeyByValue[data.round?.status ?? "not_started"],
            )}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};

export default async function GameModePage({
  params,
}: GameModePageProps): Promise<ReactElement> {
  const [{ mode }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);

  if (mode === "daily-question") {
    return renderDailyQuestionPage(locale);
  }

  return renderShellModePage(locale, mode);
}
