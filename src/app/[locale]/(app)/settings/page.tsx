import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { appSecondaryNavigationItems } from "@/components/app/navigation-model";
import { UpdateCoupleTimezoneForm } from "@/components/forms/update-couple-timezone-form";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

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
  const [settingsT, rootT, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "settings",
    }),
    getTranslations({
      locale,
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const secondaryLinks = appSecondaryNavigationItems.filter((item) => item.href !== "/settings");

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
        <UpdateCoupleTimezoneForm currentTimeZone={context.timezone} />
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
}
