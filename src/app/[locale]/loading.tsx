import type { ReactElement } from 'react';

import { getTranslations } from 'next-intl/server';

import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionCard } from '@/components/ui/section-card';
import { resolveLocaleFromParams } from '@/i18n/server';

interface GlobalLoadingProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export default async function GlobalLoading({ params }: GlobalLoadingProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const t = await getTranslations({
    locale,
    namespace: 'loading',
  });

  return (
    <main className="flex min-h-screen items-center">
      <PageContainer size="sm">
        <SectionCard
          className="mx-auto w-full max-w-md"
          padding="comfortable"
        >
          <LoadingState
            description={t('description')}
            title={t('title')}
          />
        </SectionCard>
      </PageContainer>
    </main>
  );
}
