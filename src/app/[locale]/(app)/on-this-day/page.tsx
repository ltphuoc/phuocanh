import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { OnThisDayClientPage } from '@/app/[locale]/(app)/on-this-day/on-this-day-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getOnThisDayAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface OnThisDayPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: OnThisDayPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'onThisDay');

export default async function OnThisDayPage({ params }: OnThisDayPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.onThisDay(),
    await getOnThisDayAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <OnThisDayClientPage />
    </HydrationBoundary>
  );
}
