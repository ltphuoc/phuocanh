"use client";

import { MapPinned, Route } from "lucide-react";
import { motion } from "motion/react";
import type { ReactElement } from "react";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import type {
  MapTripGroup,
  TripCard,
  VisitedPlaceCard,
} from "@/lib/server/phase-two-data";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";
import { cn } from "@/lib/utils/cn";
import { SectionCard } from "@/components/ui/section-card";

interface TravelAtlasShellProps {
  readonly groups: readonly MapTripGroup[];
  readonly timeZone: string;
}

interface AtlasPlace extends VisitedPlaceCard {
  readonly trip: TripCard;
}

const atlasTripStatusTranslationKeyByValue = {
  active: "tripStatus.active",
  completed: "tripStatus.completed",
  planned: "tripStatus.planned",
} as const;

const ATLAS_POINT_POSITION_CLASS_NAMES = [
  "left-[18%] top-[25%]",
  "left-[36%] top-[54%]",
  "left-[58%] top-[36%]",
  "left-[74%] top-[62%]",
  "left-[48%] top-[22%]",
  "left-[28%] top-[70%]",
  "left-[66%] top-[18%]",
  "left-[80%] top-[40%]",
] as const;

const getAtlasPlaces = (groups: readonly MapTripGroup[]): readonly AtlasPlace[] =>
  groups.flatMap((group) =>
    group.visitedPlaces.map((visitedPlace) => ({
      ...visitedPlace,
      trip: group.trip,
    })),
  );

export const TravelAtlasShell = ({
  groups,
  timeZone,
}: TravelAtlasShellProps): ReactElement => {
  const { format, t } = useI18n("ui.travelAtlas");
  const atlasPlaces = getAtlasPlaces(groups);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(atlasPlaces[0]?.id ?? "");
  const selectedPlace = atlasPlaces.find((visitedPlace) => visitedPlace.id === selectedPlaceId)
    ?? atlasPlaces[0];
  const formatDateLabel = (value: string): string =>
    format.dateTime(parseDateInputValueInTimeZone(value, timeZone), {
      day: "numeric",
      month: "short",
      timeZone,
      year: "numeric",
    });
  const renderTripGroup = (group: MapTripGroup): ReactElement => (
    <section className="flex flex-col gap-3" key={group.trip.id}>
      <div className="rounded-[1.4rem] border border-white/70 bg-[rgba(255,249,242,0.72)] px-4 py-3 shadow-whisper backdrop-blur-xl">
        <p className="ui-meta">
          {t("tripWindow", {
            end: formatDateLabel(group.trip.endDate),
            start: formatDateLabel(group.trip.startDate),
          })}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[1.35rem] tracking-[-0.03em] text-foreground">
              {group.trip.title}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t(atlasTripStatusTranslationKeyByValue[group.trip.status])}
            </p>
          </div>
          <span className="rounded-pill border border-white/70 bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
            {t("tripCount", { count: group.visitedPlaces.length })}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {group.visitedPlaces.map((visitedPlace) => {
          const isSelected = visitedPlace.id === selectedPlaceId;

          return (
            <button
              className={cn(
                "w-full rounded-[1.3rem] border px-4 py-3 text-left shadow-whisper transition-transform hover:-translate-y-0.5",
                isSelected
                  ? "border-primary/22 bg-primary/14"
                  : "border-white/72 bg-white/72",
              )}
              key={visitedPlace.id}
              onClick={() => setSelectedPlaceId(visitedPlace.id)}
              type="button"
            >
              <p className="ui-meta">
                {t("visitedOn", {
                  date: formatDateLabel(visitedPlace.visitedOn),
                })}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{visitedPlace.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {visitedPlace.note?.trim() || t("noteFallback")}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <SectionCard
      className="flex flex-col gap-5 overflow-hidden"
      hoverLift={false}
      padding="comfortable"
      surface="hero"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[440px] overflow-hidden rounded-[calc(var(--radius-hero)-0.5rem)] border border-white/60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_28%),linear-gradient(160deg,#fff7f0_0%,#ffe7e3_44%,#ffd6d6_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,228,0.18)_0%,rgba(255,227,225,0.05)_100%)]" />
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full opacity-50"
            fill="none"
            viewBox="0 0 800 560"
          >
            <path
              d="M96 140C170 118 248 154 302 224C346 281 402 352 505 360C612 368 655 290 714 248"
              stroke="rgba(255,148,148,0.44)"
              strokeLinecap="round"
              strokeWidth="9"
            />
            <path
              d="M164 310C230 346 302 400 430 422C534 440 620 412 708 352"
              stroke="rgba(255,255,255,0.62)"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>

          <div className="absolute inset-x-4 top-4 rounded-[1.4rem] border border-white/70 bg-[rgba(255,249,242,0.78)] px-4 py-3 shadow-whisper backdrop-blur-xl md:inset-x-6">
            <p className="ui-meta ui-couple-mark">{t("header.eyebrow")}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
                  {t("header.title")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t("header.description")}</p>
              </div>
              <div className="rounded-pill border border-white/70 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
                {t("header.badge", { count: atlasPlaces.length })}
              </div>
            </div>
          </div>

          {atlasPlaces.map((visitedPlace, index) => {
            const isSelected = visitedPlace.id === selectedPlace?.id;
            const positionClassName =
              ATLAS_POINT_POSITION_CLASS_NAMES[index % ATLAS_POINT_POSITION_CLASS_NAMES.length];

            return (
              <button
                aria-label={visitedPlace.title}
                aria-pressed={isSelected}
                className={cn("absolute", positionClassName)}
                key={visitedPlace.id}
                onClick={() => setSelectedPlaceId(visitedPlace.id)}
                type="button"
              >
                <motion.span
                  animate={{ scale: isSelected ? 1.06 : 1 }}
                  className={cn(
                    "relative inline-flex flex-col items-center gap-2",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 rounded-full border-4 border-white shadow-[0_0_0_12px_rgba(255,148,148,0.14)]",
                      isSelected ? "bg-primary" : "bg-[rgba(255,227,225,0.88)]",
                    )}
                  />
                  <span className="max-w-[11rem] rounded-pill border border-white/70 bg-[rgba(255,249,242,0.84)] px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] shadow-whisper backdrop-blur-lg">
                    {visitedPlace.title}
                  </span>
                </motion.span>
              </button>
            );
          })}

          {selectedPlace ? (
            <div className="absolute inset-x-4 bottom-4 rounded-[1.6rem] border border-white/70 bg-[rgba(255,249,242,0.88)] px-4 py-4 shadow-cloud backdrop-blur-xl md:inset-x-6">
              <div className="flex items-center gap-2 text-primary">
                <MapPinned aria-hidden="true" className="size-4" strokeWidth={2.1} />
                <p className="ui-meta">
                  {t("visitedOn", {
                    date: formatDateLabel(selectedPlace.visitedOn),
                  })}
                </p>
              </div>
              <p className="mt-2 font-display text-[1.6rem] tracking-[-0.03em] text-foreground">
                {selectedPlace.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground/80">
                {selectedPlace.trip.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selectedPlace.note?.trim() || t("noteFallback")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <span>{t(atlasTripStatusTranslationKeyByValue[selectedPlace.trip.status])}</span>
                <span>&bull;</span>
                <span>
                  {t("tripWindow", {
                    end: formatDateLabel(selectedPlace.trip.endDate),
                    start: formatDateLabel(selectedPlace.trip.startDate),
                  })}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden flex-col gap-4 xl:flex">
          <div className="rounded-[1.6rem] border border-white/70 bg-[rgba(255,249,242,0.78)] px-5 py-4 shadow-whisper backdrop-blur-xl">
            <div className="flex items-center gap-2 text-primary">
              <Route aria-hidden="true" className="size-4" strokeWidth={2.2} />
              <p className="ui-meta">{t("side.eyebrow")}</p>
            </div>
            <p className="mt-2 font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
              {t("side.title")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("side.description")}
            </p>
          </div>
          <div className="space-y-4">
            {groups.map((group) => renderTripGroup(group))}
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:hidden">
        <div className="rounded-[1.6rem] border border-white/70 bg-[rgba(255,249,242,0.78)] px-5 py-4 shadow-whisper backdrop-blur-xl">
          <div className="flex items-center gap-2 text-primary">
            <Route aria-hidden="true" className="size-4" strokeWidth={2.2} />
            <p className="ui-meta">{t("side.eyebrow")}</p>
          </div>
          <p className="mt-2 font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
            {t("side.title")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("side.description")}
          </p>
        </div>
        {groups.map((group) => renderTripGroup(group))}
      </div>
    </SectionCard>
  );
};
