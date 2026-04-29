import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { ListsClientPage } from '@/app/[locale]/(app)/lists/lists-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getListsAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface ListsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: ListsPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'lists');

export default async function ListsPage({ params }: ListsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.lists(), await getListsAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <ListsClientPage />
    </HydrationBoundary>
  );
}
