import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { PageReveal } from "@/components/ui/page-reveal";
import { TravelAtlasShell } from "@/components/ui/travel-atlas-shell";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface MapPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: MapPageProps): Promise<Metadata> => getRouteMetadata(params, "map");

export default async function MapPage({
  params,
}: MapPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: "map",
  });

  return (
    <ShellPage
      description={t("header.description")}
      eyebrow={t("header.eyebrow")}
      quote={t("header.quote")}
      title={t("header.title")}
    >
      <PageReveal>
        <TravelAtlasShell />
      </PageReveal>
    </ShellPage>
  );
}
