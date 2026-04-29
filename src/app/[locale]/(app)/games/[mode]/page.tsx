import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import type { Locale } from '@/i18n/routing';

import { HydrationBoundary } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';

import { DailyQuestionClientPage } from '@/app/[locale]/(app)/games/[mode]/daily-question-client-page';
import { GuessDateClientPage } from '@/app/[locale]/(app)/games/[mode]/guess-date-client-page';
import { TriviaClientPage } from '@/app/[locale]/(app)/games/[mode]/trivia-client-page';
import { ShellPage } from '@/components/layout/shell-page';
import { ComingSoonCard } from '@/components/ui/coming-soon-card';
import { SectionCard } from '@/components/ui/section-card';
import { Link } from '@/i18n/navigation';
import { getRouteMetadata, resolveLocaleFromParams } from '@/i18n/server';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { dehydrateAppQuery } from '@/lib/query/server-prefetch';
import {
  getDailyQuestionAppData,
  getGuessDateAppData,
  getTriviaAppData,
} from '@/lib/server/app-data';
import { getReadyCoupleContextOrRedirect } from '@/lib/server/couple-context';

interface GameModePageProps {
  readonly params: Promise<{
    readonly locale: string;
    readonly mode: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const generateMetadata = async ({ params }: GameModePageProps): Promise<Metadata> =>
  getRouteMetadata(params, 'gameMode');

const renderShellModePage = async (locale: Locale, mode: string): Promise<ReactElement> => {
  const [gameModeT, commonT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: 'gameMode',
    }),
    getTranslations({
      locale,
      namespace: 'common',
    }),
    getTranslations({
      locale,
      namespace: 'ui.comingSoonCard',
    }),
  ]);
  const modeLabel = formatSegmentLabel(mode) || gameModeT('fallbackModeLabel');

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/games"
        >
          {commonT('backToGames')}
        </Link>
      }
      description={gameModeT('header.description')}
      eyebrow={gameModeT('header.eyebrow')}
      title={modeLabel}
    >
      <SectionCard
        className="flex min-h-56 items-center justify-center"
        padding="comfortable"
        tone="muted"
      >
        <p className="max-w-lg text-center text-sm text-muted-foreground">
          {gameModeT('placeholder')}
        </p>
      </SectionCard>

      <ComingSoonCard
        badgeLabel={comingSoonCardT('badge')}
        ctaHref="/games"
        ctaLabel={gameModeT('comingSoon.cta')}
        description={gameModeT('comingSoon.description')}
        title={gameModeT('comingSoon.title')}
      />
    </ShellPage>
  );
};

const renderDailyQuestionPage = async (locale: Locale): Promise<ReactElement> => {
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.dailyQuestion(),
    await getDailyQuestionAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <DailyQuestionClientPage />
    </HydrationBoundary>
  );
};

const renderGuessDatePage = async (locale: Locale): Promise<ReactElement> => {
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(
    appQueryKeys.guessDate(),
    await getGuessDateAppData(context),
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <GuessDateClientPage />
    </HydrationBoundary>
  );
};

const renderTriviaPage = async (locale: Locale): Promise<ReactElement> => {
  const context = await getReadyCoupleContextOrRedirect(locale);
  const dehydratedState = dehydrateAppQuery(appQueryKeys.trivia(), await getTriviaAppData(context));

  return (
    <HydrationBoundary state={dehydratedState}>
      <TriviaClientPage />
    </HydrationBoundary>
  );
};

export default async function GameModePage({ params }: GameModePageProps): Promise<ReactElement> {
  const [{ mode }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);

  if (mode === 'daily-question') {
    return renderDailyQuestionPage(locale);
  }

  if (mode === 'guess-date') {
    return renderGuessDatePage(locale);
  }

  if (mode === 'trivia') {
    return renderTriviaPage(locale);
  }

  return renderShellModePage(locale, mode);
}
