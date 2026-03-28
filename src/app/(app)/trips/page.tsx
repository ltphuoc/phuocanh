import { BriefcaseBusiness } from "lucide-react";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { TripCardTemplate } from "@/components/ui/trip-card-template";

export const metadata: Metadata = {
  title: "Trips | PhuocAnh",
};

export default function TripsPage(): ReactElement {
  return (
    <ShellPage
      description="Plan and revisit your shared journeys with trip timelines and albums."
      eyebrow="Travel"
      title="Trips"
    >
      <ResponsiveGrid columns={2}>
        <TripCardTemplate
          destination="Da Lat Weekend"
          durationLabel="Jul 12 - Jul 14, 2026"
          itemCountLabel="8 memories and 2 albums"
        />
        <TripCardTemplate
          destination="Hoi An Food Hunt"
          durationLabel="Sep 03 - Sep 05, 2026"
          itemCountLabel="5 memories and 1 album"
        />
        <ComingSoonCard
          ctaHref="/albums/featured"
          ctaLabel="Open albums shell"
          description="Trip editing, stop-by-stop timelines, and linked albums will be connected once Phase 2 travel logic is implemented."
          title="Trip management"
        />
        <SectionCard className="flex flex-col justify-center" padding="comfortable">
          <EmptyState
            description="When real trip data is available, this panel will show your active and archived journeys."
            icon={<BriefcaseBusiness aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title="No connected trips yet"
          />
        </SectionCard>
      </ResponsiveGrid>
    </ShellPage>
  );
}
