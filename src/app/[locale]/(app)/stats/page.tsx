import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { StatsClientPage } from '@/app/[locale]/(app)/stats/stats-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getStatsAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface StatsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: StatsPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'stats');

export default async function StatsPage({ params }: StatsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.stats(), await getStatsAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <StatsClientPage />
    </HydrationBoundary>
  );
}
