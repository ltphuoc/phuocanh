import { CalendarClock, LockKeyhole, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { CreateFutureNoteForm } from "@/components/forms/create-future-note-form";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ShellPage } from "@/components/layout/shell-page";
import { EmptyState } from "@/components/ui/empty-state";
import { FutureNoteCard } from "@/components/ui/future-note-card";
import { PageReveal } from "@/components/ui/page-reveal";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";
import { getReadyCoupleContextOrRedirect } from "@/lib/server/couple-context";
import { getFutureNotesPageData } from "@/lib/server/phase-two-data";

interface FutureNotesPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: FutureNotesPageProps): Promise<Metadata> => getRouteMetadata(params, "futureNotes");

const formatUnlockDate = (
  unlockAt: string,
  format: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations<"futureNotes">>>,
): string => {
  const date = new Date(unlockAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? unlockAt.slice(0, 10)
    : format.dateTime(date, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      });

  return t("unlockDate", {
    date: dateLabel,
  });
};

export default async function FutureNotesPage({
  params,
}: FutureNotesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [futureNotesT, format, context] = await Promise.all([
    getTranslations({
      locale,
      namespace: "futureNotes",
    }),
    getFormatter({
      locale,
    }),
    getReadyCoupleContextOrRedirect(locale),
  ]);
  const data = await getFutureNotesPageData(context);

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
                  unlockDateLabel={formatUnlockDate(note.unlockAt, format, futureNotesT)}
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
                  unlockDateLabel={formatUnlockDate(note.unlockAt, format, futureNotesT)}
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
}
