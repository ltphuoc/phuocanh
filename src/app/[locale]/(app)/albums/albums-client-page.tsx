'use client';

import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Album, MapPinned } from 'lucide-react';

import { ResponsiveGrid } from '@/components/layout/responsive-grid';
import { ShellPage } from '@/components/layout/shell-page';
import { QueryErrorState, QueryLoadingState } from '@/components/query/query-status';
import { AlbumCard } from '@/components/ui/album-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageReveal } from '@/components/ui/page-reveal';
import { SectionCard } from '@/components/ui/section-card';
import { useI18n } from '@/hooks/useI18n';
import { Link } from '@/i18n/navigation';
import { appQueryFetchers } from '@/lib/query/app-query-fetchers';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { formatTripDateRange } from '@/lib/utils/trip-display';

export const AlbumsClientPage = (): ReactElement => {
  const { format, t: albumsT } = useI18n('albums');
  const { t: albumCardT } = useI18n('ui.albumCard');
  const { t: commonT } = useI18n('common');
  const { t: tripCardT } = useI18n('ui.tripCard');
  const query = useQuery({
    queryFn: appQueryFetchers.albums,
    queryKey: appQueryKeys.albums(),
  });
  const action = (
    <Link
      className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--elevation-soft)] transition-colors hover:bg-muted-soft"
      href="/trips"
    >
      {commonT('backToTrips')}
    </Link>
  );

  if (query.isPending) {
    return (
      <ShellPage
        action={action}
        description={albumsT('header.description')}
        eyebrow={albumsT('header.eyebrow')}
        title={albumsT('header.title')}
      >
        <QueryLoadingState />
      </ShellPage>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <ShellPage
        action={action}
        description={albumsT('header.description')}
        eyebrow={albumsT('header.eyebrow')}
        title={albumsT('header.title')}
      >
        <QueryErrorState onRetry={() => void query.refetch()} />
      </ShellPage>
    );
  }

  const data = query.data;

  return (
    <ShellPage
      action={action}
      description={albumsT('header.description')}
      eyebrow={albumsT('header.eyebrow')}
      title={albumsT('header.title')}
    >
      {data.albums.length ? (
        <PageReveal delay={0.04}>
          <ResponsiveGrid
            columns={2}
            density="compact"
          >
            {data.albums.map((album) => (
              <AlbumCard
                coverMediaType={album.coverMediaType}
                coverSignedUrl={album.coverSignedUrl}
                description={album.description}
                href={`/albums/${album.id}`}
                itemCountLabel={albumCardT('itemCount', { count: album.itemCount })}
                key={album.id}
                title={album.title}
                tripDateRangeLabel={formatTripDateRange(
                  album.trip,
                  format,
                  tripCardT,
                  data.context.timeZone,
                )}
                tripTitle={album.trip.title}
                videoCoverLabel={albumCardT('videoCoverLabel')}
              />
            ))}
          </ResponsiveGrid>
        </PageReveal>
      ) : (
        <PageReveal delay={0.04}>
          <EmptyState
            description={albumsT('empty.description')}
            icon={
              <Album
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
            }
            title={albumsT('empty.title')}
          />
        </PageReveal>
      )}

      <PageReveal delay={0.1}>
        <SectionCard
          className="flex flex-col gap-3"
          padding="comfortable"
          surface="paper"
        >
          <div className="flex items-center gap-3">
            <MapPinned
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth={2.1}
            />
            <p className="font-display text-[1.5rem] tracking-[-0.02em] text-foreground">
              {albumsT('deferred.title')}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {albumsT('deferred.description')}
          </p>
        </SectionCard>
      </PageReveal>
    </ShellPage>
  );
};
