import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { MemoryDetailClientPage } from "@/app/[locale]/(app)/memories/[memoryId]/memory-detail-client-page";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import { dehydrateAppQuery } from "@/lib/query/server-prefetch";
import { getMemoryDetailAppData } from "@/lib/server/app-data";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";

interface MemoryDetailPageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly memoryId: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: MemoryDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "memoryDetail");

export default async function MemoryDetailPage({
  params,
}: MemoryDetailPageProps): Promise<ReactElement> {
  const [{ memoryId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const data = await getMemoryDetailAppData(context, memoryId);
  if (!data) {
    notFound();
  }

  const dehydratedState = dehydrateAppQuery(appQueryKeys.memory(memoryId), data);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MemoryDetailClientPage memoryId={memoryId} />
    </HydrationBoundary>
  );
}
