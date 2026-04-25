import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { CountdownsClientPage } from "@/app/[locale]/(app)/countdowns/countdowns-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getCountdownsAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface CountdownsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: CountdownsPageProps): Promise<Metadata> => getRouteMetadata(params, "countdowns");

export default async function CountdownsPage({
  params,
}: CountdownsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.countdowns(),
    await getCountdownsAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <CountdownsClientPage />
    </HydrationBoundary>
  );
}
