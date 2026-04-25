"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { appSecondaryNavigationItems } from "@/components/app/navigation-model";
import { UpdateCoupleTimezoneForm } from "@/components/forms/update-couple-timezone-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { SectionCard } from "@/components/ui/section-card";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";

export const SettingsClientPage = (): ReactElement => {
  const { t: rootT } = useI18n();
  const { t: settingsT } = useI18n("settings");
  const query = useQuery({
    queryFn: appQueryFetchers.settings,
    queryKey: appQueryKeys.settings(),
  });
  const secondaryLinks = appSecondaryNavigationItems.filter((item) => item.href !== "/settings");

  if (query.isPending) {
    return (
      <ShellPage
        description={settingsT("header.description")}
        eyebrow={settingsT("header.eyebrow")}
        title={settingsT("header.title")}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        description={settingsT("header.description")}
        eyebrow={settingsT("header.eyebrow")}
        title={settingsT("header.title")}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  return (
    <ShellPage
      description={settingsT("header.description")}
      eyebrow={settingsT("header.eyebrow")}
      title={settingsT("header.title")}
    >
      <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
        <div className="space-y-2">
          <p className="ui-meta">{settingsT("timezone.eyebrow")}</p>
          <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
            {settingsT("timezone.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {settingsT("timezone.description")}
          </p>
        </div>
        <UpdateCoupleTimezoneForm currentTimeZone={query.data.currentTimeZone} />
      </SectionCard>

      <ResponsiveGrid columns={2} density="compact">
        {secondaryLinks.map((item) => {
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
    </ShellPage>
  );
};
