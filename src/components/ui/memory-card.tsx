"use client";

import { parseISO } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type MemoryCardVariant = "anniversary" | "compact" | "featured";

export interface MemoryCardProps {
  readonly className?: string;
  readonly happenedAt: string;
  readonly href: string;
  readonly imageUrl?: string | null;
  readonly locationName?: string | null;
  readonly mediaType?: "image" | "video" | null;
  readonly note?: string | null;
  readonly timeZone: string;
  readonly variant?: MemoryCardVariant;
}

const getMemoryLabel = (
  mediaType: "image" | "video" | null | undefined,
  t: ReturnType<typeof useTranslations<"ui.memoryCard">>,
): string | null => {
  switch (mediaType) {
    case "image":
      return t("labels.image");
    case "video":
      return t("labels.video");
    default:
      return null;
  }
};

const getMemoryPlaceholder = (
  variant: MemoryCardVariant,
  t: ReturnType<typeof useTranslations<"ui.memoryCard">>,
): string => {
  switch (variant) {
    case "anniversary":
      return t("placeholders.anniversary");
    case "featured":
      return t("placeholders.featured");
    case "compact":
    default:
      return t("placeholders.compact");
  }
};

export const MemoryCard = ({
  className,
  happenedAt,
  href,
  imageUrl,
  locationName,
  mediaType,
  note,
  timeZone,
  variant = "compact",
}: MemoryCardProps): ReactElement => {
  const reduceMotion = useReducedMotion();
  const format = useFormatter();
  const t = useTranslations("ui.memoryCard");
  const date = parseISO(happenedAt);
  const isValidDate = !Number.isNaN(date.getTime());
  const mediaLabel = getMemoryLabel(mediaType, t);
  const noteText = note?.trim() ? note : getMemoryPlaceholder(variant, t);
  const monthYearLabel = isValidDate
    ? format.dateTime(date, { month: "long", timeZone, year: "numeric" })
    : t("fallbackDate");
  const dayLabel = isValidDate ? format.dateTime(date, { day: "numeric", timeZone }) : "--";
  const weekdayLabel = isValidDate
    ? format.dateTime(date, { timeZone, weekday: "long" })
    : t("fallbackDate");
  const fullDateLabel = isValidDate
    ? format.dateTime(date, { day: "numeric", month: "short", timeZone, year: "numeric" })
    : t("fallbackDate");
  const isFeatureVariant = variant !== "compact";

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { rotate: 1, y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
    >
      <Link
        className={cn(
          "group relative block overflow-hidden rounded-[var(--radius-memory)] border border-white/72 bg-[rgba(255,248,241,0.88)] shadow-cloud backdrop-blur-xl",
          variant === "compact" ? "p-4 md:p-5" : "p-5 md:p-6",
          className,
        )}
        href={href}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_100%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-meta">{monthYearLabel}</p>
              <p className="mt-2 font-display text-[1.5rem] tracking-[-0.03em] text-foreground">
                {dayLabel}
              </p>
              <p className="text-sm text-muted-foreground">{weekdayLabel}</p>
            </div>
            {mediaLabel ? <Badge variant="primary">{mediaLabel}</Badge> : null}
          </div>
          <div
            className={cn(
              "overflow-hidden rounded-[1.6rem]",
              isFeatureVariant ? "aspect-[4/3]" : "aspect-[5/3]",
            )}
          >
            {imageUrl ? (
              <div className="relative h-full w-full">
                <Image
                  alt={t("photoAlt")}
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  fill
                  sizes={variant === "compact" ? "(min-width: 1024px) 30vw, 90vw" : "100vw"}
                  src={imageUrl}
                  unoptimized
                />
              </div>
            ) : (
              <div className="ui-gradient-memory flex h-full items-end p-4">
                <div className="rounded-pill border border-white/65 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
                  {mediaLabel ?? t("journalNote")}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p
              className={cn(
                "text-foreground",
                isFeatureVariant
                  ? "font-display text-[1.35rem] leading-[1.32] tracking-[-0.02em]"
                  : "text-sm leading-relaxed",
              )}
            >
              {noteText}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <span>{fullDateLabel}</span>
              {locationName ? (
                <>
                  <span className="text-[rgba(121,99,110,0.6)]">/</span>
                  <span>{locationName}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};

export const FeaturedMemoryObject = (props: MemoryCardProps): ReactElement => (
  <MemoryCard {...props} variant="featured" />
);
