import { ImageIcon, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { getRouteMetadata, resolveLocaleFromParams } from "@/i18n/server";

interface AlbumDetailPageProps {
  readonly params: Promise<{
    readonly albumId: string;
    readonly locale: string;
  }>;
}

const formatSegmentLabel = (segment: string): string =>
  segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const generateMetadata = async ({
  params,
}: AlbumDetailPageProps): Promise<Metadata> => getRouteMetadata(params, "albumDetail");

export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps): Promise<ReactElement> {
  const [{ albumId }, locale] = await Promise.all([params, resolveLocaleFromParams(params)]);
  const [albumDetailT, commonT, comingSoonCardT] = await Promise.all([
    getTranslations({
      locale,
      namespace: "albumDetail",
    }),
    getTranslations({
      locale,
      namespace: "common",
    }),
    getTranslations({
      locale,
      namespace: "ui.comingSoonCard",
    }),
  ]);
  const albumLabel = formatSegmentLabel(albumId) || albumDetailT("fallbackAlbumLabel");

  return (
    <ShellPage
      action={
        <Link
          className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
          href="/trips"
        >
          {commonT("backToTrips")}
        </Link>
      }
      description={albumDetailT("header.description")}
      eyebrow={albumDetailT("header.eyebrow")}
      title={albumLabel}
    >
      <ResponsiveGrid columns={2}>
        <SectionCard className="flex min-h-52 items-center justify-center" padding="comfortable">
          <EmptyState
            description={albumDetailT("mediaPlaceholder.description")}
            icon={<ImageIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={albumDetailT("mediaPlaceholder.title")}
          />
        </SectionCard>
        <SectionCard className="flex min-h-52 items-center justify-center" padding="comfortable">
          <EmptyState
            description={albumDetailT("highlightPlaceholder.description")}
            icon={<Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            title={albumDetailT("highlightPlaceholder.title")}
          />
        </SectionCard>
      </ResponsiveGrid>

      <ComingSoonCard
        badgeLabel={comingSoonCardT("badge")}
        ctaHref="/trips"
        ctaLabel={albumDetailT("comingSoon.cta")}
        description={albumDetailT("comingSoon.description")}
        title={albumDetailT("comingSoon.title")}
      />
    </ShellPage>
  );
}
