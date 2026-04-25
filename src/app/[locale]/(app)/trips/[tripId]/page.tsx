import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { TripDetailClientPage } from "@/app/[locale]/(app)/trips/[tripId]/trip-detail-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getTripDetailAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface TripDetailPageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly tripId: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: TripDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "tripDetail");

export default async function TripDetailPage({
  params,
}: TripDetailPageProps): Promise<ReactElement> {
  const [{ tripId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const data = await getTripDetailAppData(context, tripId);

  if (!data) {
    notFound();
  }

  const dehydratedState = dehydrateAppQuery(appQueryKeys.trip(tripId), data);

  return (
    <HydrationBoundary state={dehydratedState}>
      <TripDetailClientPage tripId={tripId} />
    </HydrationBoundary>
  );
}
