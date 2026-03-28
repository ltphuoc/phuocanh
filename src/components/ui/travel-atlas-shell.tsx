"use client";

import { motion } from "motion/react";
import type { ReactElement } from "react";
import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils/cn";

interface AtlasStop {
  readonly dateLabel: string;
  readonly id: string;
  readonly memoryCountLabel: string;
  readonly note: string;
  readonly positionClassName: string;
  readonly title: string;
}

const atlasStops: readonly AtlasStop[] = [
  {
    dateLabel: "Jul 12",
    id: "da-lat",
    memoryCountLabel: "8 keepsakes",
    note: "Rain, strawberries, and the walk back when the town felt all blush and fog.",
    positionClassName: "left-[22%] top-[28%]",
    title: "Da Lat",
  },
  {
    dateLabel: "Sep 03",
    id: "hoi-an",
    memoryCountLabel: "5 keepsakes",
    note: "Lantern light, too many snacks, and a promise to stay longer next time.",
    positionClassName: "left-[60%] top-[40%]",
    title: "Hoi An",
  },
  {
    dateLabel: "Oct 20",
    id: "da-nang",
    memoryCountLabel: "4 keepsakes",
    note: "Ocean air, a slow evening, and one of your favorite photos together.",
    positionClassName: "left-[48%] top-[62%]",
    title: "Da Nang",
  },
] as const;

export const TravelAtlasShell = (): ReactElement => {
  const [selectedStopId, setSelectedStopId] = useState<string>(atlasStops[0]?.id ?? "");
  const selectedStop = atlasStops.find((stop) => stop.id === selectedStopId) ?? atlasStops[0];

  return (
    <SectionCard
      className="grid gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]"
      hoverLift={false}
      padding="comfortable"
      surface="hero"
    >
      <div className="relative min-h-[440px] overflow-hidden rounded-[calc(var(--radius-hero)-0.5rem)] border border-white/60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_28%),linear-gradient(160deg,#fff7f0_0%,#ffe7e3_44%,#ffd6d6_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,228,0.18)_0%,rgba(255,227,225,0.05)_100%)]" />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-50"
          fill="none"
          viewBox="0 0 800 560"
        >
          <path
            d="M94 134C182 150 228 212 306 244C399 281 457 263 538 306C596 337 638 386 714 392"
            stroke="rgba(255,148,148,0.56)"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M310 246C346 286 402 327 493 343"
            stroke="rgba(255,255,255,0.7)"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
        <div className="absolute inset-x-4 top-4 rounded-[1.4rem] border border-white/70 bg-[rgba(255,249,242,0.78)] px-4 py-3 shadow-whisper backdrop-blur-xl md:inset-x-6">
          <p className="ui-meta ui-couple-mark">Travel atlas</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
                Places that changed the story
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The map becomes part scrapbook, part itinerary, part memory drawer.
              </p>
            </div>
            <div className="rounded-pill border border-white/70 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-whisper">
              Route glow
            </div>
          </div>
        </div>
        {atlasStops.map((stop) => {
          const isActive = stop.id === selectedStop.id;

          return (
            <button
              className={cn("absolute", stop.positionClassName)}
              key={stop.id}
              onClick={() => setSelectedStopId(stop.id)}
              type="button"
            >
              <motion.span
                animate={{ scale: isActive ? 1.06 : 1 }}
                className={cn(
                  "relative inline-flex flex-col items-center gap-2",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  className={cn(
                    "inline-flex size-5 rounded-full border-4 border-white shadow-[0_0_0_12px_rgba(255,148,148,0.14)]",
                    isActive ? "bg-primary" : "bg-[rgba(255,227,225,0.88)]",
                  )}
                />
                <span className="rounded-pill border border-white/70 bg-[rgba(255,249,242,0.84)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] shadow-whisper backdrop-blur-lg">
                  {stop.title}
                </span>
              </motion.span>
            </button>
          );
        })}
        <div className="absolute inset-x-4 bottom-4 rounded-[1.6rem] border border-white/70 bg-[rgba(255,249,242,0.88)] px-4 py-4 shadow-cloud backdrop-blur-xl md:hidden">
          <p className="ui-meta">{selectedStop.dateLabel}</p>
          <p className="mt-2 font-display text-[1.6rem] tracking-[-0.03em] text-foreground">
            {selectedStop.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedStop.note}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {selectedStop.memoryCountLabel}
          </p>
        </div>
      </div>
      <div className="hidden flex-col gap-3 xl:flex">
        <div className="rounded-[1.6rem] border border-white/70 bg-[rgba(255,249,242,0.78)] px-5 py-4 shadow-whisper backdrop-blur-xl">
          <p className="ui-meta">{selectedStop.dateLabel}</p>
          <p className="mt-2 font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
            {selectedStop.title}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selectedStop.note}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {selectedStop.memoryCountLabel}
          </p>
        </div>
        <div className="space-y-2">
          {atlasStops.map((stop) => (
            <button
              className={cn(
                "w-full rounded-[1.35rem] border px-4 py-3 text-left shadow-whisper transition-transform hover:-translate-y-0.5",
                stop.id === selectedStop.id
                  ? "border-primary/20 bg-primary/14"
                  : "border-white/72 bg-white/72",
              )}
              key={stop.id}
              onClick={() => setSelectedStopId(stop.id)}
              type="button"
            >
              <p className="text-sm font-semibold text-foreground">{stop.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stop.note}</p>
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};
