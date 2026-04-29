import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { GamesClientPage } from '@/app/[locale]/(app)/games/games-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getGamesAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface GamesPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: GamesPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'games');

export default async function GamesPage({ params }: GamesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.games(), await getGamesAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <GamesClientPage />
    </HydrationBoundary>
  );
}
