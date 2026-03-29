import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { appSecondaryNavigationItems } from "@/components/app/navigation-model";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface SettingsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: SettingsPageProps): Promise<Metadata> => getRouteMetadata(params, "settings");

export default async function SettingsPage({
  params,
}: SettingsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [settingsT, rootT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "settings",
    }),
    getTranslations({
      locale,
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);

  return (
    <ShellPage
      description={settingsT("header.description")}
      eyebrow={settingsT("header.eyebrow")}
      title={settingsT("header.title")}
    >
      <ResponsiveGrid columns={2} density="compact">
        {appSecondaryNavigationItems.map((item) => {
          const Icon = item.icon;
          const label = rootT(item.labelKey);

          return (
            <Link
              className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className="size-4 text-primary" strokeWidth={2.2} />
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {settingsT("openShell", {
                  label,
                })}
              </p>
            </Link>
          );
        })}
      </ResponsiveGrid>

      <SectionCard className="text-sm text-muted-foreground" padding="comfortable" tone="muted">
        {settingsT("description")}
      </SectionCard>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/home"
        ctaLabel={settingsT("comingSoon.cta")}
        description={settingsT("comingSoon.description")}
        title={settingsT("comingSoon.title")}
      />
    </ShellPage>
  );
}
