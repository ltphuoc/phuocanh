'use client';

import type { ReactElement } from 'react';
import type { Locale } from '@/i18n/routing';

import { useQuery } from '@tanstack/react-query';
import { Brain, Sparkles, WandSparkles } from 'lucide-react';

import { ResponsiveGrid } from '@/components/layout/responsive-grid';
import { ShellPage } from '@/components/layout/shell-page';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { Badge } from '@/components/ui/badge';
import { InsetPanel } from '@/components/ui/inset-panel';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { Link } from '@/i18n/navigation';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';

const statusTranslationKeyByValue = {
  completed: 'status.completed',
  not_started: 'status.not_started',
  waiting_for_partner: 'status.waiting_for_partner',
  waiting_for_you: 'status.waiting_for_you',
} as const;

const localeTranslationKeyByValue: Record<Locale, 'locale.en' | 'locale.vi'> = {
  en: 'locale.en',
  vi: 'locale.vi',
};

export const GamesClientPage = (): ReactElement => {
  const { t: dailyQuestionT } = useI18n('dailyQuestion');
  const { t: gamesT } = useI18n('games');
  const query = useQuery({
    queryFn: appQueryFetchers.games,
    queryKey: appQueryKeys.games(),
  });

  if (query.isPending) {
    return (
      <ShellPage
        description={gamesT('header.description')}
        eyebrow={gamesT('header.eyebrow')}
        title={gamesT('header.title')}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        description={gamesT('header.description')}
        eyebrow={gamesT('header.eyebrow')}
        title={gamesT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;
  const dailyQuestionCtaLabel = data.dailyQuestion
    ? gamesT('dailyQuestion.openCta')
    : gamesT('dailyQuestion.generateCta');
  const dailyQuestionSummary = data.dailyQuestion
    ? gamesT('dailyQuestion.readySummary', {
        count: data.dailyQuestion.answerCount,
      })
    : gamesT('dailyQuestion.emptySummary');
  const guessDateCtaLabel = data.guessDate
    ? gamesT('guessDate.openCta')
    : gamesT('guessDate.generateCta');
  const guessDateSummary = data.guessDate
    ? gamesT('guessDate.readySummary', {
        count: data.guessDate.answerCount,
      })
    : gamesT('guessDate.emptySummary');
  const triviaCtaLabel = data.trivia ? gamesT('trivia.openCta') : gamesT('trivia.generateCta');
  const triviaSummary = data.trivia
    ? gamesT('trivia.readySummary', {
        count: data.trivia.answerCount,
      })
    : gamesT('trivia.emptySummary');

  return (
    <ShellPage
      description={gamesT('header.description')}
      eyebrow={gamesT('header.eyebrow')}
      title={gamesT('header.title')}
    >
      <ResponsiveGrid columns={3}>
        <PageReveal delay={0.04}>
          <SectionCard
            className="flex h-full flex-col gap-5"
            padding="comfortable"
            surface="glass"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                  <p className="ui-meta">{gamesT('dailyQuestion.eyebrow')}</p>
                </div>
                <h2 className="ui-card-title">{gamesT('dailyQuestion.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gamesT('dailyQuestion.description')}
                </p>
              </div>
              <Badge variant="primary">
                {dailyQuestionT(
                  statusTranslationKeyByValue[data.dailyQuestion?.status ?? 'not_started'],
                )}
              </Badge>
            </div>

            <InsetPanel>
              <p className="text-sm font-semibold text-foreground">{dailyQuestionSummary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.dailyQuestion
                  ? gamesT('dailyQuestion.promptLocale', {
                      locale: dailyQuestionT(
                        localeTranslationKeyByValue[data.dailyQuestion.promptLocale],
                      ),
                    })
                  : gamesT('dailyQuestion.generateHint')}
              </p>
            </InsetPanel>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="ui-gradient-active inline-flex h-12 items-center justify-center rounded-pill px-5 text-sm font-semibold text-primary-foreground shadow-cloud transition-[filter,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-102"
                href="/games/daily-question"
              >
                {dailyQuestionCtaLabel}
              </Link>
              <p className="text-xs text-muted-foreground">{gamesT('dailyQuestion.liveNote')}</p>
            </div>
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.08}>
          <SectionCard
            className="flex h-full flex-col gap-5"
            padding="comfortable"
            surface="paper"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <WandSparkles
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                  <p className="ui-meta">{gamesT('guessDate.eyebrow')}</p>
                </div>
                <h2 className="ui-card-title">{gamesT('guessDate.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gamesT('guessDate.description')}
                </p>
              </div>
              <Badge variant="primary">
                {dailyQuestionT(
                  statusTranslationKeyByValue[data.guessDate?.status ?? 'not_started'],
                )}
              </Badge>
            </div>

            <InsetPanel>
              <p className="text-sm font-semibold text-foreground">{guessDateSummary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.guessDate ? gamesT('guessDate.clueSource') : gamesT('guessDate.generateHint')}
              </p>
            </InsetPanel>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="ui-gradient-active inline-flex h-12 items-center justify-center rounded-pill px-5 text-sm font-semibold text-primary-foreground shadow-cloud transition-[filter,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-102"
                href="/games/guess-date"
              >
                {guessDateCtaLabel}
              </Link>
              <p className="text-xs text-muted-foreground">{gamesT('guessDate.liveNote')}</p>
            </div>
          </SectionCard>
        </PageReveal>

        <PageReveal delay={0.12}>
          <SectionCard
            className="flex h-full flex-col gap-5"
            padding="comfortable"
            surface="glass"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Brain
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                  <p className="ui-meta">{gamesT('trivia.eyebrow')}</p>
                </div>
                <h2 className="ui-card-title">{gamesT('trivia.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gamesT('trivia.description')}
                </p>
              </div>
              <Badge variant="primary">
                {dailyQuestionT(statusTranslationKeyByValue[data.trivia?.status ?? 'not_started'])}
              </Badge>
            </div>

            <InsetPanel>
              <p className="text-sm font-semibold text-foreground">{triviaSummary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.trivia ? gamesT('trivia.clueSource') : gamesT('trivia.generateHint')}
              </p>
            </InsetPanel>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="ui-gradient-active inline-flex h-12 items-center justify-center rounded-pill px-5 text-sm font-semibold text-primary-foreground shadow-cloud transition-[filter,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-102"
                href="/games/trivia"
              >
                {triviaCtaLabel}
              </Link>
              <p className="text-xs text-muted-foreground">{gamesT('trivia.liveNote')}</p>
            </div>
          </SectionCard>
        </PageReveal>
      </ResponsiveGrid>

      <PageReveal delay={0.12}>
        <SectionCard
          className="flex flex-col gap-3"
          padding="comfortable"
          surface="petal"
        >
          <p className="ui-meta">{gamesT('statsBridge.eyebrow')}</p>
          <h2 className="ui-card-title text-accent-blue-strong">{gamesT('statsBridge.title')}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {gamesT('statsBridge.description')}
          </p>
          <div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-pill border border-white/72 bg-white/78 px-4 text-sm font-semibold text-foreground shadow-whisper transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/92"
              href="/stats"
            >
              {gamesT('statsBridge.cta')}
            </Link>
          </div>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
