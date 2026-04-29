'use client';

import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';

import { GenerateDailyQuestionForm } from '@/components/forms/generate-daily-question-form';
import { SubmitDailyQuestionAnswerForm } from '@/components/forms/submit-daily-question-answer-form';
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

const localeTranslationKeyByValue = {
  en: 'locale.en',
  vi: 'locale.vi',
} as const;

const answerAuthorTranslationKeyByValue = {
  partner: 'answers.partner',
  viewer: 'answers.viewer',
} as const;

export const DailyQuestionClientPage = (): ReactElement => {
  const { t: commonT } = useI18n('common');
  const { format, t: dailyQuestionT } = useI18n('dailyQuestion');
  const query = useQuery({
    queryFn: appQueryFetchers.dailyQuestion,
    queryKey: appQueryKeys.dailyQuestion(),
  });
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
        description={dailyQuestionT('header.description')}
        eyebrow={dailyQuestionT('header.eyebrow')}
        title={dailyQuestionT('header.title')}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        action={action}
        description={dailyQuestionT('header.description')}
        eyebrow={dailyQuestionT('header.eyebrow')}
        title={dailyQuestionT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;
  const roundDateLabel = data.round
    ? format.dateTime(parseDateInputValueInTimeZone(data.round.roundDate, data.context.timeZone), {
        day: 'numeric',
        month: 'short',
        timeZone: data.context.timeZone,
        year: 'numeric',
      })
    : data.todayDateToken;

  return (
    <ShellPage
      action={action}
      description={dailyQuestionT('header.description')}
      eyebrow={dailyQuestionT('header.eyebrow')}
      title={dailyQuestionT('header.title')}
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
                <Sparkles
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                <p className="ui-meta text-primary-foreground/80">
                  {dailyQuestionT('round.eyebrow')}
                </p>
              </div>
              <h2 className="font-display text-[2rem] tracking-[-0.03em] text-primary-foreground">
                {data.round ? dailyQuestionT('round.title') : dailyQuestionT('intro.title')}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-primary-foreground/82">
                {data.round
                  ? dailyQuestionT('round.description')
                  : dailyQuestionT('intro.description')}
              </p>
            </div>
            <Badge variant="primary">
              {dailyQuestionT(statusTranslationKeyByValue[data.round?.status ?? 'not_started'])}
            </Badge>
          </div>

          {data.round ? (
            <div className="space-y-4 rounded-[1.7rem] border border-white/35 bg-white/18 px-5 py-5 text-primary-foreground shadow-cloud backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.08em] text-primary-foreground/75 uppercase">
                <span>{dailyQuestionT('round.date', { date: roundDateLabel })}</span>
                <span>
                  {dailyQuestionT('round.locale', {
                    locale: dailyQuestionT(localeTranslationKeyByValue[data.round.promptLocale]),
                  })}
                </span>
                <span>
                  {dailyQuestionT('round.answerCount', { count: data.round.answerCount })}
                </span>
              </div>
              <p className="font-display text-[2rem] leading-tight tracking-[-0.03em] text-primary-foreground">
                {data.round.promptText}
              </p>
            </div>
          ) : (
            <GenerateDailyQuestionForm />
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
              <p className="ui-meta">{dailyQuestionT('composer.eyebrow')}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {dailyQuestionT('composer.title')}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {dailyQuestionT('composer.description')}
              </p>
            </div>
            <SubmitDailyQuestionAnswerForm roundId={data.round.id} />
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
            <p className="ui-meta">{dailyQuestionT('pending.eyebrow')}</p>
            <h2 className="font-display text-[1.8rem] tracking-[-0.03em] text-foreground">
              {dailyQuestionT('pending.title')}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {dailyQuestionT('pending.viewerLocked')}
            </p>
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round?.revealAnswers ? (
        <PageReveal delay={0.16}>
          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="ui-meta">{dailyQuestionT('reveal.eyebrow')}</p>
              <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
                {dailyQuestionT('reveal.title')}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {dailyQuestionT('reveal.description')}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.round.revealedAnswers.map((answer) => (
                <SectionCard
                  key={`${answer.author}-${answer.submittedAt}`}
                  padding="comfortable"
                  surface="paper"
                >
                  <div className="flex flex-col gap-3">
                    <Badge variant={answer.author === 'viewer' ? 'primary' : 'neutral'}>
                      {dailyQuestionT(answerAuthorTranslationKeyByValue[answer.author])}
                    </Badge>
                    <p className="text-sm leading-relaxed text-foreground">{answer.answerBody}</p>
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
          <p className="ui-meta">{dailyQuestionT('statusNote.eyebrow')}</p>
          <h2 className="font-display text-[1.7rem] tracking-[-0.03em] text-foreground">
            {dailyQuestionT('statusNote.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {dailyQuestionT(statusNoteTranslationKeyByValue[data.round?.status ?? 'not_started'])}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
