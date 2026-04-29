import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { HydrationBoundary } from '@tanstack/react-query';

import { SettingsClientPage } from '@/app/[locale]/(app)/settings/settings-client-page';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import { getSettingsAppData } from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface SettingsPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: SettingsPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'settings');

export default async function SettingsPage({ params }: SettingsPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.settings(), getSettingsAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <SettingsClientPage />
    </HydrationBoundary>
  );
}
