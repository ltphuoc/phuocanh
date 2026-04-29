import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { FutureNotesClientPage } from '@/app/[locale]/(app)/future-notes/future-notes-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getFutureNotesAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface FutureNotesPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: FutureNotesPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'futureNotes');

export default async function FutureNotesPage({
  params,
}: FutureNotesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.futureNotes(),
    await getFutureNotesAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <FutureNotesClientPage />
    </HydrationBoundary>
  );
}
