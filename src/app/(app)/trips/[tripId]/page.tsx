import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";

interface TripDetailPageProps {
  readonly params: Promise<{
    readonly tripId: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const metadata: Metadata = {
  title: "Trip Detail | PhuocAnh",
};

export default async function TripDetailPage({
  params,
}: TripDetailPageProps): Promise<ReactElement> {
  const { tripId } = await params;
  const tripLabel = formatSegmentLabel(tripId) || "Trip";

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/trips"
        >
          Back to trips
        </Link>
      }
      description="A dedicated trip detail layout with timeline, stops, and album slots."
      eyebrow="Travel detail"
      title={tripLabel}
    >
      <ResponsiveGrid columns={2}>
        <TripCardTemplate
          destination={tripLabel}
          durationLabel="Sample duration until real data is wired"
          itemCountLabel="0 stops loaded from backend yet"
        />
        <SectionCard className="flex flex-col gap-3" padding="comfortable" tone="muted">
          <p className="ui-heading-lg">Planned sections</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>Trip overview and mood highlights</li>
            <li>Visited places timeline</li>
            <li>Albums linked to this trip</li>
          </ul>
        </SectionCard>
      </ResponsiveGrid>

      <ComingSoonCard
        ctaHref="/map"
        ctaLabel="Preview map shell"
        description="This detail page will become fully data-driven once trip entities and map pins are delivered in Phase 2."
        title="Trip timeline and map integration"
      />
    </ShellPage>
  );
}
