import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getHomeAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

import { HomeClientPage } from './home-client-page';

interface HomePageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: HomePageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'home');

export default async function HomePage({ params }: HomePageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.home(), await getHomeAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <HomeClientPage />
    </HydrationBoundary>
  );
}
