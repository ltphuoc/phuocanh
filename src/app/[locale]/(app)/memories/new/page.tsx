import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { getTranslations } from 'next-intl/server';

import { CreateMemoryForm } from '@/components/forms/create-memory-form';
import { PageHeader } from '@/components/layout/page-header';
import { SectionStack } from '@/components/layout/section-stack';
import { SectionCard } from '@/components/ui/section-card';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface NewMemoryPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({ params }: NewMemoryPageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'addMemory');

export default async function NewMemoryPage({ params }: NewMemoryPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [t, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: 'newMemory',
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl">
      <SectionStack>
        <PageHeader
          description={t('header.description')}
          eyebrow={t('header.eyebrow')}
          title={t('header.title')}
        />
        <SectionCard
          className="flex flex-col gap-4"
          padding="comfortable"
        >
          <CreateMemoryForm coupleId={context.coupleId} />
        </SectionCard>
      </SectionStack>
    </main>
  );
}
