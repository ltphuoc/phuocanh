import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { TripsClientPage } from "@/app/[locale]/(app)/trips/trips-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getTripsAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface TripsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: TripsPageProps): Promise<Metadata> => getRouteMetadata(params, "trips");

export default async function TripsPage({
  params,
}: TripsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.trips(),
    await getTripsAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <TripsClientPage />
    </HydrationBoundary>
  );
}
