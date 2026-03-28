import { format, parseISO } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { FeaturedMemoryObject } from "@/components/ui/memory-card";
import { SectionCard } from "@/components/ui/section-card";

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
}

const getQuote = (note: string | null | undefined): string =>
  note?.trim()
    ? note.trim().slice(0, 120)
    : "A small private world made from ordinary days, soft plans, and moments worth keeping.";

export const AnniversarySpotlight = ({
  coupleStartedAt,
  featuredMemory,
  relationshipDays,
}: AnniversarySpotlightProps): ReactElement => (
  <SectionCard
    className="grid gap-6 overflow-hidden xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
    hoverLift={false}
    padding="comfortable"
    surface="hero"
  >
    <div className="absolute inset-0">
      {featuredMemory?.imageUrl ? (
        <Image
          alt="Featured memory background"
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
        <p className="ui-meta ui-couple-mark">Editorial romance</p>
        <div className="space-y-2">
          <p className="ui-display">Day {Math.max(1, relationshipDays + 1)}</p>
          <p className="ui-page-description ui-copy-lg max-w-2xl">
            Together since {format(parseISO(coupleStartedAt), "MMMM d, yyyy")}. Built from late-night
            notes, ordinary breakfasts, and the chapters you keep choosing to revisit.
          </p>
        </div>
      </div>
      <p className="ui-quote max-w-xl text-foreground/90">
        &ldquo;{getQuote(featuredMemory?.note)}&rdquo;
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          className="ui-gradient-active inline-flex items-center rounded-pill px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cloud"
          href={featuredMemory?.href ?? "/memories/new"}
        >
          {featuredMemory ? "Open latest chapter" : "Add your first chapter"}
        </Link>
        <Link
          className="inline-flex items-center rounded-pill border border-white/70 bg-white/68 px-5 py-3 text-sm font-semibold text-foreground shadow-whisper"
          href="/on-this-day"
        >
          Revisit today
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
        />
      ) : (
        <div className="rounded-[var(--radius-memory)] border border-white/70 bg-[rgba(255,255,255,0.72)] p-6 shadow-cloud backdrop-blur-md">
          <p className="ui-meta">Anniversary highlight</p>
          <p className="mt-3 font-display text-[2rem] tracking-[-0.03em] text-foreground">
            Start your first keepsake
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add a memory and this chapter surface will begin to fill with images, dates, and the
            little details that make your space feel alive.
          </p>
        </div>
      )}
    </div>
  </SectionCard>
);
