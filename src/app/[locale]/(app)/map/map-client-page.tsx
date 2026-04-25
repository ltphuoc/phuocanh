"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ShellPage } from "@/components/layout/shell-page";
import { QueryErrorState, QueryLoadingState } from "@/components/query/query-status";
import { EmptyState } from "@/components/ui/empty-state";
import { PageReveal } from "@/components/ui/page-reveal";
import { TravelAtlasShell } from "@/components/ui/travel-atlas-shell";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/hooks/useI18n";
import { appQueryFetchers } from "@/lib/query/app-query-fetchers";
import { appQueryKeys } from "@/lib/query/app-query-keys";

export const MapClientPage = (): ReactElement => {
  const { t: commonT } = useI18n("common");
  const { t: mapT } = useI18n("map");
  const query = useQuery({
    queryFn: appQueryFetchers.map,
    queryKey: appQueryKeys.map(),
  });
  const action = (
    <Link
      className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
      href="/trips"
    >
      {commonT("backToTrips")}
    </Link>
  );

  if (query.isPending) {
    return (
      <ShellPage
        action={action}
        description={mapT("header.description")}
        eyebrow={mapT("header.eyebrow")}
        quote={mapT("header.quote")}
        title={mapT("header.title")}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        action={action}
        description={mapT("header.description")}
        eyebrow={mapT("header.eyebrow")}
        quote={mapT("header.quote")}
        title={mapT("header.title")}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;

  return (
    <ShellPage
      action={action}
      description={mapT("header.description")}
      eyebrow={mapT("header.eyebrow")}
      quote={mapT("header.quote")}
      title={mapT("header.title")}
    >
      <PageReveal>
        {data.visitedPlaces.length ? (
          <TravelAtlasShell groups={data.trips} timeZone={data.context.timeZone} />
        ) : (
          <EmptyState
            action={
              <Link
                className="inline-flex h-11 items-center rounded-pill border border-white/70 bg-white/68 px-5 text-sm font-semibold text-foreground shadow-whisper transition-colors hover:bg-white/85"
                href="/trips"
              >
                {mapT("empty.cta")}
              </Link>
            }
            description={mapT("empty.description")}
            title={mapT("empty.title")}
          />
        )}
      </PageReveal>
    </ShellPage>
  );
};
