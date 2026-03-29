import { CalendarClock, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { ListRow } from "@/components/ui/list-row";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface FutureNotesPageProps {
  readonly params: Promise<{
    readonly locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: FutureNotesPageProps): Promise<Metadata> => getRouteMetadata(params, "futureNotes");

export default async function FutureNotesPage({
  params,
}: FutureNotesPageProps): Promise<ReactElement> {
  const locale = await resolveLocaleFromParams(params);
  const [futureNotesT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "futureNotes",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);

  return (
    <ShellPage
      description={futureNotesT("header.description")}
      eyebrow={futureNotesT("header.eyebrow")}
      title={futureNotesT("header.title")}
    >
      <SectionCard className="flex flex-col gap-3" padding="comfortable">
        <ListRow
          action={<Lock aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={2.1} />}
          subtitle={futureNotesT("notes.anniversary.subtitle")}
          title={futureNotesT("notes.anniversary.title")}
        />
        <ListRow
          action={
            <CalendarClock
              aria-hidden="true"
              className="size-4 text-muted-foreground"
              strokeWidth={2.1}
            />
          }
          subtitle={futureNotesT("notes.future.subtitle")}
          title={futureNotesT("notes.future.title")}
        />
      </SectionCard>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/countdowns"
        ctaLabel={futureNotesT("comingSoon.cta")}
        description={futureNotesT("comingSoon.description")}
        title={futureNotesT("comingSoon.title")}
      />
    </ShellPage>
  );
}
