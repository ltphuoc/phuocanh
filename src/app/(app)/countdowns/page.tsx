import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { CountdownWidgetTemplate } from "@/components/ui/countdown-widget-template";

export const metadata: Metadata = {
  title: "Countdowns | PhuocAnh",
};

export default function CountdownsPage(): ReactElement {
  return (
    <ShellPage
      description="Track upcoming birthdays, anniversaries, and trips in one calm timeline."
      eyebrow="Events"
      title="Countdowns"
    >
      <ResponsiveGrid columns={2} density="compact">
        <CountdownWidgetTemplate daysLeft={9} eventName="Anniversary dinner" eventType="Anniversary" />
        <CountdownWidgetTemplate daysLeft={25} eventName="Partner birthday" eventType="Birthday" />
        <CountdownWidgetTemplate daysLeft={42} eventName="Da Nang trip" eventType="Travel" />
        <CountdownWidgetTemplate daysLeft={77} eventName="Mini staycation" eventType="Plan" />
      </ResponsiveGrid>

      <ComingSoonCard
        ctaHref="/future-notes"
        ctaLabel="Open future notes shell"
        description="Recurring reminders, timezone-aware scheduling, and reminder jobs will be connected with countdown data in a later phase."
        title="Reminder automation"
      />
    </ShellPage>
  );
}
