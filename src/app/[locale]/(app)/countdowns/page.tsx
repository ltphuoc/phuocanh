import { BellRing, CalendarHeart, Hourglass } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { CreateCountdownForm } from "@/components/forms/create-countdown-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { EmptyState } from "@/components/ui/empty-state";
import { CountdownWidgetTemplate } from "@/components/ui/countdown-widget-template";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getCountdownsPageData, type CountdownCard } from "@/lib/server/phase-two-data";

interface CountdownsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

const kindTranslationKeyByValue = {
  anniversary: "kind.anniversary",
  birthday: "kind.birthday",
  custom: "kind.custom",
  plan: "kind.plan",
  travel: "kind.travel",
} as const;

export const generateMetadata = async ({
  params,
}: CountdownsPageProps): Promise<Metadata> => getRouteMetadata(params, "countdowns");

const getCountdownBadgeLabel = (
  countdown: CountdownCard,
  t: Awaited<ReturnType<typeof getTranslations<"ui.countdown">>>,
): string => {
  if (countdown.daysFromToday === 0) {
    return t("today");
  }

  if (countdown.daysFromToday > 0) {
    return t("daysLeft", { count: countdown.daysFromToday });
  }

  return t("daysAgo", { count: Math.abs(countdown.daysFromToday) });
};

const getCountdownMetaLabel = (
  countdown: CountdownCard,
  t: Awaited<ReturnType<typeof getTranslations<"ui.countdown">>>,
): string => {
  if (countdown.daysFromToday === 0) {
    return t("todayHint");
  }

  return countdown.daysFromToday > 0 ? t("remaining") : t("since");
};

const formatCountdownDate = (
  countdown: CountdownCard,
  format: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations<"ui.countdown">>>,
): string => {
  const date = new Date(countdown.targetAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? countdown.targetAt.slice(0, 10)
    : format.dateTime(date, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      });

  return t("date", {
    date: dateLabel,
  });
};

export default async function CountdownsPage({
  params,
}: CountdownsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [countdownsT, countdownUiT, format, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "countdowns",
    }),
    getTranslations({
      locale,
      namespace: "ui.countdown",
    }),
    getFormatter({
      locale,
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const data = await getCountdownsPageData(context);

  return (
    <ShellPage
      description={countdownsT("header.description")}
      eyebrow={countdownsT("header.eyebrow")}
      title={countdownsT("header.title")}
    >
      <PageReveal delay={0.04}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT("composer.eyebrow")}</p>
            <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
              {countdownsT("composer.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {countdownsT("composer.description")}
            </p>
          </div>
          <CreateCountdownForm />
        </SectionCard>
      </PageReveal>

      <PageReveal delay={0.08}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT("sections.upcomingEyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {countdownsT("sections.upcomingTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {countdownsT("sections.upcomingDescription")}
            </p>
          </div>

          {data.upcoming.length ? (
            <ResponsiveGrid columns={2} density="compact">
              {data.upcoming.map((countdown) => (
                <CountdownWidgetTemplate
                  daysLeftLabel={getCountdownBadgeLabel(countdown, countdownUiT)}
                  eventName={countdown.title}
                  eventType={countdownsT(kindTranslationKeyByValue[countdown.kind])}
                  key={countdown.id}
                  note={countdown.note}
                  remainingLabel={getCountdownMetaLabel(countdown, countdownUiT)}
                  targetDateLabel={formatCountdownDate(countdown, format, countdownUiT)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={countdownsT("empty.upcoming.description")}
              icon={<CalendarHeart aria-hidden="true" className="size-4" strokeWidth={2.2} />}
              title={countdownsT("empty.upcoming.title")}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.12}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{countdownsT("sections.pastEyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {countdownsT("sections.pastTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {countdownsT("sections.pastDescription")}
            </p>
          </div>

          {data.past.length ? (
            <ResponsiveGrid columns={2} density="compact">
              {data.past.map((countdown) => (
                <CountdownWidgetTemplate
                  daysLeftLabel={getCountdownBadgeLabel(countdown, countdownUiT)}
                  eventName={countdown.title}
                  eventType={countdownsT(kindTranslationKeyByValue[countdown.kind])}
                  key={countdown.id}
                  note={countdown.note}
                  remainingLabel={getCountdownMetaLabel(countdown, countdownUiT)}
                  targetDateLabel={formatCountdownDate(countdown, format, countdownUiT)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={countdownsT("empty.past.description")}
              icon={<Hourglass aria-hidden="true" className="size-4" strokeWidth={2.2} />}
              title={countdownsT("empty.past.title")}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.16}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
          <div className="flex items-center gap-3">
            <BellRing aria-hidden="true" className="size-5 text-primary" strokeWidth={2.1} />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {countdownsT("automationNote.title")}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {countdownsT("automationNote.description")}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
}
