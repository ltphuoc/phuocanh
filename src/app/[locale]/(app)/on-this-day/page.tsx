import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryCard } from "@/components/ui/memory-card";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getOnThisDayData } from "@/lib/server/phase-one-data";

interface OnThisDayPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: OnThisDayPageProps): Promise<Metadata> => getRouteMetadata(params, "onThisDay");

export default async function OnThisDayPage({
  params,
}: OnThisDayPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [onThisDayT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "onThisDay",
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const memories = await getOnThisDayData(context);
  const stackedMemories = memories.slice(0, 3);

  return (
    <main>
      <SectionStack>
        <PageReveal>
          <PageHeader
            description={onThisDayT("header.description")}
            eyebrow={onThisDayT("header.eyebrow")}
            quote={onThisDayT("header.quote")}
            surface="hero"
            title={onThisDayT("header.title")}
          />
        </PageReveal>

        {memories.length ? (
          <PageReveal delay={0.05}>
            <SectionCard hoverLift={false} padding="comfortable" surface="glass">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="ui-meta ui-couple-mark">{onThisDayT("stackedReveal.eyebrow")}</p>
                  <h2 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
                    {onThisDayT("stackedReveal.title")}
                  </h2>
                </div>
                <div className="rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
                  {onThisDayT("stackedReveal.chapterCount", {
                    count: memories.length,
                  })}
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="relative min-h-[320px]">
                  {stackedMemories.map((memory, index) => (
                    <div
                      className="absolute inset-x-0 transition-transform"
                      key={memory.id}
                      style={{
                        top: `${index * 18}px`,
                        transform: `rotate(${index === 0 ? "-2.5deg" : index === 1 ? "1.5deg" : "-0.5deg"})`,
                        zIndex: stackedMemories.length - index,
                      }}
                    >
                      <MemoryCard
                        happenedAt={memory.happenedAt}
                        href={`/memories/${memory.id}`}
                        locationName={memory.locationName}
                        mediaType={memory.mediaType}
                        note={memory.note}
                        timeZone={context.timezone}
                        variant="anniversary"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {memories.map((memory) => (
                    <MemoryCard
                      happenedAt={memory.happenedAt}
                      href={`/memories/${memory.id}`}
                      key={memory.id}
                      locationName={memory.locationName}
                      mediaType={memory.mediaType}
                      note={memory.note}
                      timeZone={context.timezone}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </SectionCard>
          </PageReveal>
        ) : (
          <EmptyState
            description={onThisDayT("empty.description")}
            icon={<CalendarDays aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={onThisDayT("empty.title")}
          />
        )}
      </SectionStack>
    </main>
  );
}
