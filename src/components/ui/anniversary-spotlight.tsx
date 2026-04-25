"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { FeaturedMemoryObject } from "@/components/ui/memory-card";
import { SectionCard } from "@/components/ui/section-card";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";

interface AnniversarySpotlightMemory {
  readonly happenedAt: string;
  readonly href: string;
  readonly imageUrl?: string | null;
  readonly locationName?: string | null;
  readonly mediaType?: "image" | "video" | null;
  readonly note?: string | null;
}

interface AnniversarySpotlightProps {
  readonly coupleStartedAt: string;
  readonly featuredMemory?: AnniversarySpotlightMemory | null;
  readonly relationshipDays: number;
  readonly timeZone: string;
}

const getQuote = (
  note: string | null | undefined,
  fallback: string,
): string => (note?.trim() ? note.trim().slice(0, 120) : fallback);

export const AnniversarySpotlight = ({
  coupleStartedAt,
  featuredMemory,
  relationshipDays,
  timeZone,
}: AnniversarySpotlightProps): ReactElement => {
  const t = useTranslations("ui.anniversarySpotlight");
  const format = useFormatter();
  const startedAtDate = parseDateInputValueInTimeZone(coupleStartedAt, timeZone);
  const sinceDateLabel = Number.isNaN(startedAtDate.getTime())
    ? coupleStartedAt
    : format.dateTime(startedAtDate, {
        day: "numeric",
        month: "long",
        timeZone,
        year: "numeric",
      });

  return (
    <SectionCard
      className="grid gap-6 overflow-hidden xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
      hoverLift={false}
      padding="comfortable"
      surface="hero"
    >
      <div className="absolute inset-0">
        {featuredMemory?.imageUrl ? (
          <Image
            alt=""
            className="object-cover opacity-24"
            fill
            sizes="(min-width: 1280px) 50vw, 100vw"
            src={featuredMemory.imageUrl}
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,241,0.92)_0%,rgba(255,245,228,0.82)_52%,rgba(255,227,225,0.62)_100%)]" />
      </div>
      <div className="relative z-10 flex flex-col gap-6">
        <div className="space-y-3">
          <p className="ui-meta ui-couple-mark">{t("eyebrow")}</p>
          <div className="space-y-2">
            <p className="ui-display">
              {t("dayCount", {
                count: Math.max(1, relationshipDays + 1),
              })}
            </p>
            <p className="ui-page-description ui-copy-lg max-w-2xl">
              {t("since", {
                date: sinceDateLabel,
              })}
            </p>
          </div>
        </div>
        <p className="ui-quote max-w-xl text-foreground/90">
          &ldquo;{getQuote(featuredMemory?.note, t("quoteFallback"))}&rdquo;
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="ui-gradient-active inline-flex items-center rounded-pill px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cloud"
            href={featuredMemory?.href ?? "/memories/new"}
          >
            {featuredMemory ? t("openLatest") : t("addFirst")}
          </Link>
          <Link
            className="inline-flex items-center rounded-pill border border-white/70 bg-white/68 px-5 py-3 text-sm font-semibold text-foreground shadow-whisper"
            href="/on-this-day"
          >
            {t("revisit")}
          </Link>
        </div>
      </div>
      <div className="relative z-10">
        {featuredMemory ? (
          <FeaturedMemoryObject
            happenedAt={featuredMemory.happenedAt}
            href={featuredMemory.href}
            imageUrl={featuredMemory.imageUrl}
            locationName={featuredMemory.locationName}
            mediaType={featuredMemory.mediaType}
            note={featuredMemory.note}
            timeZone={timeZone}
          />
        ) : (
          <div className="rounded-[var(--radius-memory)] border border-white/70 bg-[rgba(255,255,255,0.72)] p-6 shadow-cloud backdrop-blur-md">
            <p className="ui-meta">{t("empty.eyebrow")}</p>
            <p className="mt-3 font-display text-[2rem] tracking-[-0.03em] text-foreground">
              {t("empty.title")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("empty.description")}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};
