"use client";

import { CalendarClock, LockKeyhole, Sparkles } from "lucide-react";
import { parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CreateFutureNoteForm } from "@/components/forms/create-future-note-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { EmptyState } from "@/components/ui/empty-state";
import { FutureNoteCard } from "@/components/ui/future-note-card";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";

export const FutureNotesClientPage = (): ReactElement => {
  const { format, t: futureNotesT } = useI18n("futureNotes");
  const query = useQuery({
    queryFn: appQueryFetchers.futureNotes,
    queryKey: appQueryKeys.futureNotes(),
  });

  const formatUnlockDate = (unlockAt: string, timeZone: string): string => {
    const date = parseISO(unlockAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? unlockAt.slice(0, 10)
      : format.dateTime(date, {
          day: "numeric",
          month: "short",
          timeZone,
          year: "numeric",
        });

    return futureNotesT("unlockDate", {
      date: dateLabel,
    });
  };

  if (query.isPending) {
    return (
      <ShellPage
        description={futureNotesT("header.description")}
        eyebrow={futureNotesT("header.eyebrow")}
        title={futureNotesT("header.title")}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        description={futureNotesT("header.description")}
        eyebrow={futureNotesT("header.eyebrow")}
        title={futureNotesT("header.title")}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;

  return (
    <ShellPage
      description={futureNotesT("header.description")}
      eyebrow={futureNotesT("header.eyebrow")}
      title={futureNotesT("header.title")}
    >
      <PageReveal delay={0.04}>
        <SectionCard className="flex flex-col gap-5" padding="comfortable" surface="glass">
          <div className="space-y-2">
            <p className="ui-meta">{futureNotesT("composer.eyebrow")}</p>
            <h2 className="font-display text-[2rem] tracking-[-0.03em] text-foreground">
              {futureNotesT("composer.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {futureNotesT("composer.description")}
            </p>
          </div>
          <CreateFutureNoteForm />
        </SectionCard>
      </PageReveal>

      <PageReveal delay={0.08}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{futureNotesT("sections.lockedEyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {futureNotesT("sections.lockedTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {futureNotesT("sections.lockedDescription")}
            </p>
          </div>

          {data.locked.length ? (
            <ResponsiveGrid columns={2} density="compact">
              {data.locked.map((note) => (
                <FutureNoteCard
                  key={note.id}
                  status={note.status}
                  statusLabel={futureNotesT("status.locked")}
                  title={note.title}
                  unlockDateLabel={formatUnlockDate(note.unlockAt, data.context.timeZone)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={futureNotesT("empty.locked.description")}
              icon={<LockKeyhole aria-hidden="true" className="size-4" strokeWidth={2.2} />}
              title={futureNotesT("empty.locked.title")}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.12}>
        <section className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="ui-meta">{futureNotesT("sections.unlockedEyebrow")}</p>
            <h2 className="font-display text-[1.9rem] tracking-[-0.03em] text-foreground">
              {futureNotesT("sections.unlockedTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {futureNotesT("sections.unlockedDescription")}
            </p>
          </div>

          {data.unlocked.length ? (
            <ResponsiveGrid columns={2} density="compact">
              {data.unlocked.map((note) => (
                <FutureNoteCard
                  body={note.body}
                  key={note.id}
                  status={note.status}
                  statusLabel={futureNotesT("status.unlocked")}
                  title={note.title}
                  unlockDateLabel={formatUnlockDate(note.unlockAt, data.context.timeZone)}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              description={futureNotesT("empty.unlocked.description")}
              icon={<CalendarClock aria-hidden="true" className="size-4" strokeWidth={2.2} />}
              title={futureNotesT("empty.unlocked.title")}
            />
          )}
        </section>
      </PageReveal>

      <PageReveal delay={0.16}>
        <SectionCard className="flex flex-col gap-3" padding="comfortable" surface="paper">
          <div className="flex items-center gap-3">
            <Sparkles aria-hidden="true" className="size-5 text-primary" strokeWidth={2.1} />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {futureNotesT("securityNote.title")}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {futureNotesT("securityNote.description")}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
