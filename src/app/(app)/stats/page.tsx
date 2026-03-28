import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { StatCardTemplate } from "@/components/ui/stat-card-template";

export const metadata: Metadata = {
  title: "Stats | PhuocAnh",
};

export default function StatsPage(): ReactElement {
  return (
    <ShellPage
      description="A soft dashboard for fun couple activity metrics."
      eyebrow="Insights"
      title="Stats"
    >
      <ResponsiveGrid columns={3} density="compact">
        <StatCardTemplate label="Memories this month" trendLabel="+6 vs last month" value="12" />
        <StatCardTemplate label="Current streak" trendLabel="Both answered daily" value="7 days" />
        <StatCardTemplate label="Trips completed" trendLabel="Shared adventures" value="3" />
      </ResponsiveGrid>

      <ComingSoonCard
        ctaHref="/games"
        ctaLabel="Open games shell"
        description="These widgets are placeholders for event-sourced stats and streak aggregations that will be delivered in Phase 3."
        title="Analytics pipeline"
      />
    </ShellPage>
  );
}
