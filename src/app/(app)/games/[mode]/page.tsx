import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { SectionCard } from "@/components/ui/section-card";

interface GameModePageProps {
  readonly params: Promise<{
    readonly mode: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const metadata: Metadata = {
  title: "Game Mode | PhuocAnh",
};

export default async function GameModePage({
  params,
}: GameModePageProps): Promise<ReactElement> {
  const { mode } = await params;
  const modeLabel = formatSegmentLabel(mode) || "Mode";

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/games"
        >
          Back to games
        </Link>
      }
      description="Mode-specific game view structure is ready for prompt and answer flows."
      eyebrow="Game mode"
      title={modeLabel}
    >
      <SectionCard className="flex min-h-56 items-center justify-center" padding="comfortable" tone="muted">
        <p className="max-w-lg text-center text-sm text-muted-foreground">
          This route is a structured shell for the selected game mode. Prompt generation, answer
          capture, and streak updates will connect here in a later phase.
        </p>
      </SectionCard>

      <ComingSoonCard
        ctaHref="/games"
        ctaLabel="Back to game hub"
        description="All gameplay logic remains unchanged and intentionally unimplemented in this UI-only restructure."
        title="Gameplay wiring"
      />
    </ShellPage>
  );
}
