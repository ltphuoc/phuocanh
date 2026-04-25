import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { MapClientPage } from "@/app/[locale]/(app)/map/map-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getMapAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

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
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.map(),
    await getMapAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <MapClientPage />
    </HydrationBoundary>
  );
}
