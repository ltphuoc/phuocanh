import type { ReactElement } from 'react';

import { getTranslations } from 'next-intl/server';

import { PageContainer } from '@/components/layout/page-container';
import { SectionCard } from '@/components/ui/section-card';
import { Link } from '@/i18n/navigation';

export default async function NotFound(): Promise<ReactElement> {
  const [t, commonT] = await Promise.all([getTranslations('notFound'), getTranslations('common')]);

  return (
    <main className="flex min-h-screen items-center">
      <PageContainer size="sm">
        <SectionCard
          className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center"
          padding="comfortable"
        >
          <h1 className="ui-page-title">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          <Link
            className="text-sm font-semibold text-primary"
            href="/home"
          >
            {commonT('backHome')}
          </Link>
        </SectionCard>
      </PageContainer>
    </main>
  );
}
