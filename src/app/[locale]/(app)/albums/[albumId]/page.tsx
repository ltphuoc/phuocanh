import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { AlbumDetailClientPage } from "@/app/[locale]/(app)/albums/[albumId]/album-detail-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getAlbumDetailAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface AlbumDetailPageProps {
  readonly params: Promise<{
    readonly albumId: string;
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: AlbumDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "albumDetail");

export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps): Promise<ReactElement> {
  const [{ albumId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const data = await getAlbumDetailAppData(context, albumId);

  if (!data) {
    notFound();
  }

  const dehydratedState = dehydrateAppQuery(appQueryKeys.album(albumId), data);

  return (
    <HydrationBoundary state={dehydratedState}>
      <AlbumDetailClientPage albumId={albumId} />
    </HydrationBoundary>
  );
}
