import { ImageIcon, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";

interface AlbumDetailPageProps {
  readonly params: Promise<{
    readonly albumId: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const metadata: Metadata = {
  title: "Album Detail | PhuocAnh",
};

export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps): Promise<ReactElement> {
  const { albumId } = await params;
  const albumLabel = formatSegmentLabel(albumId) || "Album";

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/trips"
        >
          Back to trips
        </Link>
      }
      description="Album layout is ready for media grouping, captions, and trip linking."
      eyebrow="Album"
      title={albumLabel}
    >
      <ResponsiveGrid columns={2}>
        <SectionCard className="flex min-h-52 items-center justify-center" padding="comfortable">
          <EmptyState
            description="Photo and video tiles will render here once storage-backed album items are available."
            icon={<ImageIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title="Media grid placeholder"
          />
        </SectionCard>
        <SectionCard className="flex min-h-52 items-center justify-center" padding="comfortable">
          <EmptyState
            description="Pinned highlights and captions from this album will appear in this panel."
            icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title="Highlights placeholder"
          />
        </SectionCard>
      </ResponsiveGrid>

      <ComingSoonCard
        ctaHref="/trips"
        ctaLabel="Go to trips shell"
        description="Album entities, upload workflows, and trip associations are planned for the next feature phase."
        title="Album data wiring"
      />
    </ShellPage>
  );
}
