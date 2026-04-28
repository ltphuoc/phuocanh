"use client";

import { Brain, CheckCircle2, LockKeyhole, Sparkles, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { GenerateTriviaRoundForm } from "@/components/forms/generate-trivia-round-form";
import { SubmitTriviaAnswerForm } from "@/components/forms/submit-trivia-answer-form";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { Badge } from "@/components/ui/badge";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";

const statusTranslationKeyByValue = {
  completed: "status.completed",
  not_started: "status.not_started",
  waiting_for_partner: "status.waiting_for_partner",
  waiting_for_you: "status.waiting_for_you",
} as const;

const statusNoteTranslationKeyByValue = {
  completed: "statusNote.copy.completed",
  not_started: "statusNote.copy.not_started",
  waiting_for_partner: "statusNote.copy.waiting_for_partner",
  waiting_for_you: "statusNote.copy.waiting_for_you",
} as const;

const answerAuthorTranslationKeyByValue = {
  partner: "answers.partner",
  viewer: "answers.viewer",
} as const;

export const TriviaClientPage = (): ReactElement => {
  const { t: commonT } = useI18n("common");
  const { t: triviaT } = useI18n("trivia");
  const query = useQuery({
    queryFn: appQueryFetchers.trivia,
    queryKey: appQueryKeys.trivia(),
  });
  const action = (
    <Link
      className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
      href="/games"
    >
      {commonT("backToGames")}
    </Link>
  );

  if (query.isPending) {
    return (
      <ShellPage
        action={action}
        description={triviaT("header.description")}
        eyebrow={triviaT("header.eyebrow")}
        title={triviaT("header.title")}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        action={action}
        description={triviaT("header.description")}
        eyebrow={triviaT("header.eyebrow")}
        title={triviaT("header.title")}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;

  return (
    <ShellPage
      action={action}
      description={triviaT("header.description")}
      eyebrow={triviaT("header.eyebrow")}
      title={triviaT("header.title")}
    >
      <PageReveal delay={0.04}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="hero">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Brain aria-hidden="true" className="size-4" strokeWidth={2.2} />
                <p className="ui-meta text-primary-foreground/80">{triviaT("round.eyebrow")}</p>
              </div>
              <h2 className="font-display text-[2rem] text-primary-foreground">
                {data.round ? triviaT("round.title") : triviaT("intro.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-primary-foreground/82">
                {data.round ? triviaT("round.description") : triviaT("intro.description")}
              </p>
            </div>
            <Badge variant="primary">
              {triviaT(statusTranslationKeyByValue[data.round?.status ?? "not_started"])}
            </Badge>
          </div>

          {data.round ? (
            <div className="space-y-4 rounded-[1.7rem] border border-white/35 bg-white/18 px-5 py-5 text-primary-foreground shadow-cloud backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase text-primary-foreground/75">
                <span>{triviaT("round.localDay", { date: data.round.roundDate })}</span>
                <span>{triviaT("round.answerCount", { count: data.round.answerCount })}</span>
              </div>
              <p className="font-display text-[2rem] leading-tight text-primary-foreground">
                {data.round.clueText}
              </p>
            </div>
          ) : (
            <GenerateTriviaRoundForm />
          )}
        </SectionCard>
      </PageReveal>

      {data.round && !data.round.viewerHasAnswered ? (
        <PageReveal delay={0.08}>
          <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
            <div className="space-y-2">
              <p className="ui-meta">{triviaT("composer.eyebrow")}</p>
              <h2 className="font-display text-[1.9rem] text-foreground">
                {triviaT("composer.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {triviaT("composer.description")}
              </p>
            </div>
            <SubmitTriviaAnswerForm options={data.round.answerOptions} roundId={data.round.id} />
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round && data.round.viewerHasAnswered && !data.round.revealAnswers ? (
        <PageReveal delay={0.12}>
          <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
            <div className="flex items-center gap-2 text-primary">
              <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={2.2} />
              <p className="ui-meta">{triviaT("pending.eyebrow")}</p>
            </div>
            <h2 className="font-display text-[1.8rem] text-foreground">
              {triviaT("pending.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {triviaT("pending.viewerLocked")}
            </p>
          </SectionCard>
        </PageReveal>
      ) : null}

      {data.round?.revealAnswers ? (
        <PageReveal delay={0.16}>
          <section className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="ui-meta">{triviaT("reveal.eyebrow")}</p>
              <h2 className="font-display text-[1.9rem] text-foreground">
                {triviaT("reveal.title")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {triviaT("reveal.description", {
                  answer: data.round.correctAnswer ?? "",
                })}
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
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={answer.author === "viewer" ? "primary" : "neutral"}>
                        {triviaT(answerAuthorTranslationKeyByValue[answer.author])}
                      </Badge>
                      {answer.isCorrect ? (
                        <CheckCircle2 aria-hidden="true" className="size-5 text-primary" />
                      ) : (
                        <XCircle aria-hidden="true" className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {triviaT("reveal.selectedAnswer")}
                    </p>
                    <p className="font-display text-[1.7rem] text-foreground">
                      {answer.selectedAnswer}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {answer.isCorrect
                        ? triviaT("reveal.correct")
                        : triviaT("reveal.incorrect")}
                    </p>
                  </div>
                </SectionCard>
              ))}
            </div>
          </section>
        </PageReveal>
      ) : null}

      <PageReveal delay={0.2}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="petal">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
            <p className="ui-meta">{triviaT("statusNote.eyebrow")}</p>
          </div>
          <h2 className="font-display text-[1.7rem] text-foreground">
            {triviaT("statusNote.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {triviaT(statusNoteTranslationKeyByValue[data.round?.status ?? "not_started"])}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
