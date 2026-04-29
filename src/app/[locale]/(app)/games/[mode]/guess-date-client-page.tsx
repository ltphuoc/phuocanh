'use client';

import type { ReactElement } from 'react';

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, LockKeyhole, Sparkles } from 'lucide-react';

import { GenerateGuessDateRoundForm } from '@/components/forms/generate-guess-date-round-form';
import { SubmitGuessDateAnswerForm } from '@/components/forms/submit-guess-date-answer-form';
import { ShellPage } from '@/components/layout/shell-page';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { Badge } from '@/components/ui/badge';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { Link } from '@/i18n/navigation';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { parseDateInputValueInTimeZone } from '@/lib/utils/couple-timezone';

const statusTranslationKeyByValue = {
  completed: 'status.completed',
  not_started: 'status.not_started',
  waiting_for_partner: 'status.waiting_for_partner',
  waiting_for_you: 'status.waiting_for_you',
} as const;

const statusNoteTranslationKeyByValue = {
  completed: 'statusNote.copy.completed',
  not_started: 'statusNote.copy.not_started',
  waiting_for_partner: 'statusNote.copy.waiting_for_partner',
  waiting_for_you: 'statusNote.copy.waiting_for_you',
} as const;

const guessAuthorTranslationKeyByValue = {
  partner: 'guesses.partner',
  viewer: 'guesses.viewer',
} as const;

const WAITING_REVEAL_REFETCH_INTERVAL_MS = 3_000;

export const GuessDateClientPage = (): ReactElement => {
  const { t: commonT } = useI18n('common');
  const { format, t: guessDateT } = useI18n('guessDate');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: appQueryFetchers.guessDate,
    queryKey: appQueryKeys.guessDate(),
    refetchInterval: (currentQuery) => {
      const round = currentQuery.state.data?.round;
      return round?.viewerHasAnswered && !round.revealAnswers
        ? WAITING_REVEAL_REFETCH_INTERVAL_MS
        : false;
    },
    refetchIntervalInBackground: true,
  });
  const hasRevealedAnswers = query.data?.round?.revealAnswers ?? false;

  useEffect(() => {
    if (!hasRevealedAnswers) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: appQueryKeys.games() });
  }, [hasRevealedAnswers, queryClient]);

  const action = (
    <Link
      className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
      href="/games"
    >
      {commonT('backToGames')}
    </Link>
  );

  if (query.isPending) {
    return (
      <ShellPage
        action={action}
        description={guessDateT('header.description')}
        eyebrow={guessDateT('header.eyebrow')}
        title={guessDateT('header.title')}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        action={action}
        description={guessDateT('header.description')}
        eyebrow={guessDateT('header.eyebrow')}
        title={guessDateT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;
  const actualDateLabel = data.round?.actualDate
    ? format.dateTime(parseDateInputValueInTimeZone(data.round.actualDate, data.context.timeZone), {
        day: 'numeric',
        month: 'short',
        timeZone: data.context.timeZone,
        year: 'numeric',
      })
    : null;

  return (
    <ShellPage
      action={action}
      description={guessDateT('header.description')}
      eyebrow={guessDateT('header.eyebrow')}
      title={guessDateT('header.title')}
    >
      <PageReveal delay={0.04}>
        <SectionCard
          className="flex flex-col gap-5"
          padding="comfortable"
          surface="hero"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <CalendarDays
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                <p className="ui-meta text-primary-foreground/80">{guessDateT('round.eyebrow')}</p>
              </div>
              <h2 className="font-display text-[2rem] text-primary-foreground">
                {data.round ? guessDateT('round.title') : guessDateT('intro.title')}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-primary-foreground/82">
                {data.round ? guessDateT('round.description') : guessDateT('intro.description')}
              </p>
            </div>
            <Badge variant="primary">
              {guessDateT(statusTranslationKeyByValue[data.round?.status ?? 'not_started'])}
            </Badge>
          </div>

          {data.round ? (
            <div className="space-y-4 rounded-[1.7rem] border border-white/35 bg-white/18 px-5 py-5 text-primary-foreground shadow-cloud backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-xs text-primary-foreground/75 uppercase">
                <span>{guessDateT('round.localDay', { date: data.round.roundDate })}</span>
                <span>{guessDateT('round.answerCount', { count: data.round.answerCount })}</span>
              </div>
              <p className="font-display text-[2rem] leading-tight text-primary-foreground">
                {data.round.clueText}
              </p>
            </div>
          ) : (
            <GenerateGuessDateRoundForm />
          )}
        </SectionCard>
      </PageReveal>

      {data.round && !data.round.viewerHasAnswered ? (
        <PageReveal delay={0.08}>
          <SectionCard
            className="flex flex-col gap-5"
            padding="comfortable"
            surface="glass"
          >
            <div className="space-y-2">
              <p className="ui-meta">{guessDateT('composer.eyebrow')}</p>
              <h2 className="font-display text-[1.9rem] text-foreground">
                {guessDateT('composer.title')}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {guessDateT('composer.description')}
              </p>
            </div>
            <SubmitGuessDateAnswerForm roundId={data.round.id} />
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round && data.round.viewerHasAnswered && !data.round.revealAnswers ? (
        <PageReveal delay={0.12}>
          <SectionCard
            className="flex flex-col gap-3"
            padding="comfortable"
            surface="paper"
          >
            <div className="flex items-center gap-2 text-primary">
              <LockKeyhole
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              <p className="ui-meta">{guessDateT('pending.eyebrow')}</p>
            </div>
            <h2 className="font-display text-[1.8rem] text-foreground">
              {guessDateT('pending.title')}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {guessDateT('pending.viewerLocked')}
            </p>
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round?.revealAnswers ? (
        <PageReveal delay={0.16}>
          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="ui-meta">{guessDateT('reveal.eyebrow')}</p>
              <h2 className="font-display text-[1.9rem] text-foreground">
                {guessDateT('reveal.title')}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {guessDateT('reveal.description', {
                  date: actualDateLabel ?? data.round.actualDate ?? '',
                })}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.round.revealedGuesses.map((guess) => (
                <SectionCard
                  key={`${guess.author}-${guess.submittedAt}`}
                  padding="comfortable"
                  surface="paper"
                >
                  <div className="flex flex-col gap-3">
                    <Badge variant={guess.author === 'viewer' ? 'primary' : 'neutral'}>
                      {guessDateT(guessAuthorTranslationKeyByValue[guess.author])}
                    </Badge>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {guessDateT('reveal.guessedDate')}
                    </p>
                    <p className="font-display text-[1.7rem] text-foreground">
                      {format.dateTime(
                        parseDateInputValueInTimeZone(guess.guessedDate, data.context.timeZone),
                        {
                          day: 'numeric',
                          month: 'short',
                          timeZone: data.context.timeZone,
                          year: 'numeric',
                        },
                      )}
                    </p>
                  </div>
                </SectionCard>
              ))}
            </div>
          </section>
        </PageReveal>
      ) : null}

      <PageReveal delay={0.2}>
        <SectionCard
          className="flex flex-col gap-3"
          padding="comfortable"
          surface="petal"
        >
          <div className="flex items-center gap-2 text-primary">
            <Sparkles
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            <p className="ui-meta">{guessDateT('statusNote.eyebrow')}</p>
          </div>
          <h2 className="font-display text-[1.7rem] text-foreground">
            {guessDateT('statusNote.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {guessDateT(statusNoteTranslationKeyByValue[data.round?.status ?? 'not_started'])}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
