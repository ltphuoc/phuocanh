import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { AlbumsClientPage } from "@/app/[locale]/(app)/albums/albums-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getAlbumsAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface AlbumsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: AlbumsPageProps): Promise<Metadata> => getRouteMetadata(params, "albums");

export default async function AlbumsPage({
  params,
}: AlbumsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.albums(),
    await getAlbumsAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <AlbumsClientPage />
    </HydrationBoundary>
  );
}
