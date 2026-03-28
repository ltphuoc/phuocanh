import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { appSecondaryNavigationItems } from "@/components/app/navigation-model";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { SectionCard } from "@/components/ui/section-card";

export const metadata: Metadata = {
  title: "Settings | PhuocAnh",
};

export default function SettingsPage(): ReactElement {
  return (
    <ShellPage
      description="Use this screen as the 'More' hub for secondary sections while core logic remains unchanged."
      eyebrow="More"
      title="Settings and extras"
    >
      <ResponsiveGrid columns={2} density="compact">
        {appSecondaryNavigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className="size-4 text-primary" strokeWidth={2.2} />
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the {item.label.toLowerCase()} shell page.
              </p>
            </Link>
          );
        })}
      </ResponsiveGrid>

      <SectionCard className="text-sm text-muted-foreground" padding="comfortable" tone="muted">
        This settings page currently acts as the mobile and desktop “More” entry. Account/privacy
        controls will be added in a future phase.
      </SectionCard>

      <ComingSoonCard
        ctaHref="/home"
        ctaLabel="Back to home"
        description="Preference controls and profile-level settings remain out of scope for this UI-only pass."
        title="Settings controls"
      />
    </ShellPage>
  );
}
