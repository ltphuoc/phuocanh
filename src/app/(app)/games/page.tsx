import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { GameCardTemplate } from "@/components/ui/game-card-template";
import { SectionCard } from "@/components/ui/section-card";

export const metadata: Metadata = {
  title: "Games | PhuocAnh",
};

export default function GamesPage(): ReactElement {
  return (
    <ShellPage
      description="Play memory-based mini games and keep your couple streak alive."
      eyebrow="Play"
      title="Games"
    >
      <ResponsiveGrid columns={2}>
        <GameCardTemplate
          ctaLabel="Guess the date"
          description="Pick the day of a shared memory from your timeline."
          title="Guess mode"
          trailing={
            <Link
              className="inline-flex h-9 items-center rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted-soft"
              href="/games/guess-date"
            >
              Open shell
            </Link>
          }
        />
        <GameCardTemplate
          ctaLabel="Daily question"
          description="Answer one couple question each day to keep the streak."
          title="Daily mode"
          trailing={
            <Link
              className="inline-flex h-9 items-center rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted-soft"
              href="/games/daily-question"
            >
              Open shell
            </Link>
          }
        />
      </ResponsiveGrid>

      <SectionCard className="text-sm text-muted-foreground" padding="comfortable" tone="muted">
        This is a presentational game hub. Real prompts, answers, and scoring remain untouched and
        are not wired yet.
      </SectionCard>

      <ComingSoonCard
        ctaHref="/stats"
        ctaLabel="Open stats shell"
        description="Game rounds, prompt generation, and score events will be linked when game backend features are implemented."
        title="Game engine integration"
      />
    </ShellPage>
  );
}
