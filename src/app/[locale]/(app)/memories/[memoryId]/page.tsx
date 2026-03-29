import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SectionStack } from "@/components/layout/section-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { signMemoryMediaStorageItems } from "@/lib/server/memory-media";
import { getMemoryDetailData } from "@/lib/server/phase-one-data";

interface MemoryDetailPageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly memoryId: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: MemoryDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "memoryDetail");

export default async function MemoryDetailPage({
  params,
}: MemoryDetailPageProps): Promise<ReactElement> {
  const [{ memoryId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const [t, commonT, format] = await Promise.all([
    getTranslations({
      locale,
      namespace: "memoryDetail",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getFormatter({
      locale,
    }),
  ]);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const memory = await getMemoryDetailData(context, memoryId);
  if (!memory) {
    notFound();
  }

  const mediaUrls = await signMemoryMediaStorageItems(memory.media);

  const firstLine = memory.note?.trim().split("\n")[0] ?? t("header.quoteFallback");
  const happenedAtDate = new Date(memory.happenedAt);
  const happenedAtLabel = Number.isNaN(happenedAtDate.getTime())
    ? memory.happenedAt
    : format.dateTime(happenedAtDate, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "long",
        year: "numeric",
      });

  return (
    <PageContainer className="pb-8" size="reading">
      <SectionStack>
        <PageReveal>
          <PageHeader
            action={
              <Link
                className="inline-flex items-center rounded-pill border border-white/70 bg-white/68 px-5 py-3 text-sm font-semibold text-foreground shadow-whisper"
                href="/home"
              >
                {commonT("backHome")}
              </Link>
            }
            description={happenedAtLabel}
            eyebrow={t("header.eyebrow")}
            quote={memory.note?.trim() ? firstLine : undefined}
            surface="hero"
            title={memory.locationName ?? t("header.fallbackLocation")}
          />
        </PageReveal>

        <PageReveal delay={0.06}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
            <div className="space-y-3">
              <p className="ui-meta">{t("story.label")}</p>
              <p className="font-display text-[2rem] leading-[1.28] tracking-[-0.03em] text-foreground">
                {memory.note?.trim() || t("story.empty")}
              </p>
            </div>
            {memory.locationName ? (
              <div className="rounded-pill border border-white/72 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
                {memory.locationName}
              </div>
            ) : null}
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.1}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="paper">
            <div>
              <p className="ui-meta">{t("media.label")}</p>
              <h2 className="mt-2 font-display text-[2rem] tracking-[-0.03em] text-foreground">
                {t("media.title")}
              </h2>
            </div>
            <div className="grid gap-4">
              {mediaUrls.length ? (
                mediaUrls.map((media) =>
                  media.signedUrl ? (
                    media.mediaType === "image" ? (
                      <div
                        className="overflow-hidden rounded-[1.8rem] border border-white/70 shadow-cloud"
                        key={media.id}
                      >
                        <Image
                          alt={t("mediaAlt")}
                          className="h-auto w-full object-cover"
                          height={900}
                          src={media.signedUrl}
                          unoptimized
                          width={1600}
                        />
                      </div>
                    ) : (
                      <video
                        className="w-full rounded-[1.8rem] border border-white/70 shadow-cloud"
                        controls
                        key={media.id}
                        preload="metadata"
                        src={media.signedUrl}
                      />
                    )
                  ) : (
                    <EmptyState
                      className="h-full"
                      description={t("media.loadErrorDescription")}
                      key={media.id}
                      title={t("media.loadErrorTitle")}
                    />
                  ),
                )
              ) : (
                <EmptyState
                  description={t("media.noneDescription")}
                  title={t("media.noneTitle")}
                />
              )}
            </div>
          </SectionCard>
        </PageReveal>
      </SectionStack>
    </PageContainer>
  );
}
