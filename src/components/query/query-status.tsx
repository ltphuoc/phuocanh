'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionCard } from '@/components/ui/section-card';
import {
  CardGridSkeleton,
  DetailSkeleton,
  StatGridSkeleton,
  TimelineSkeleton,
} from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/useI18n';

export type QueryLoadingVariant = 'spinner' | 'timeline' | 'card-grid' | 'stat-grid' | 'detail';

interface QueryLoadingStateProps {
  /** Layout skeleton variant. Defaults to 'spinner' (backward compatible). */
  readonly variant?: QueryLoadingVariant;
}

interface QueryErrorStateProps {
  readonly onRetry: () => void;
}

export const QueryLoadingState = ({
  variant = 'spinner',
}: QueryLoadingStateProps): ReactElement => {
  const { t } = useI18n('loading');
  const label = t('title');

  if (variant === 'timeline') return <TimelineSkeleton label={label} />;
  if (variant === 'card-grid') return <CardGridSkeleton label={label} />;
  if (variant === 'stat-grid') return <StatGridSkeleton label={label} />;
  if (variant === 'detail') return <DetailSkeleton label={label} />;

  return (
    <LoadingState
      description={t('description')}
      title={t('title')}
    />
  );
};

export const QueryErrorState = ({ onRetry }: QueryErrorStateProps): ReactElement => {
  const { t } = useI18n('errors');

  return (
    <SectionCard
      className="flex flex-col gap-4"
      padding="comfortable"
      tone="muted"
    >
      <div className="space-y-2">
        <h2 className="ui-card-title">{t('genericTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('genericDescription')}</p>
      </div>
      <Button
        className="w-full md:w-auto"
        onClick={onRetry}
        type="button"
        variant="outline"
      >
        {t('tryAgain')}
      </Button>
    </SectionCard>
  );
};
