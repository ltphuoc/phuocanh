'use client';

import type { ReactElement } from 'react';
import type {
  MapMemoryPlace,
  MapTripGroup,
  TripCard,
  VisitedPlaceCard,
} from '@/lib/server/phase-two-data';
import type { Map as MaplibreMap } from 'maplibre-gl';

import { useEffect, useMemo, useRef, useState } from 'react';

import { MapPinned, Route } from 'lucide-react';
import { motion } from 'motion/react';

import { SectionCard } from '@/components/ui/section-card';
import { useHydratedReducedMotion } from '@/hooks/use-hydrated-reduced-motion';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils/cn';
import { parseDateInputValueInTimeZone } from '@/lib/utils/couple-timezone';

interface TravelAtlasShellProps {
  readonly groups: readonly MapTripGroup[];
  readonly memories: readonly MapMemoryPlace[];
  readonly timeZone: string;
  readonly tripLocations: readonly TripCard[];
}

interface AtlasPlace extends VisitedPlaceCard {
  readonly trip: TripCard;
}

const atlasTripStatusTranslationKeyByValue = {
  active: 'tripStatus.active',
  completed: 'tripStatus.completed',
  planned: 'tripStatus.planned',
} as const;

const ATLAS_POINT_POSITION_CLASS_NAMES = [
  'left-[18%] top-[25%]',
  'left-[36%] top-[54%]',
  'left-[58%] top-[36%]',
  'left-[74%] top-[62%]',
  'left-[48%] top-[22%]',
  'left-[28%] top-[70%]',
  'left-[66%] top-[18%]',
  'left-[80%] top-[40%]',
] as const;

const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const getAtlasPlaces = (groups: readonly MapTripGroup[]): readonly AtlasPlace[] =>
  groups.flatMap((group) =>
    group.visitedPlaces.map((visitedPlace) => ({
      ...visitedPlace,
      trip: group.trip,
    })),
  );

interface MapMarkerPoint {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly title: string;
  readonly type: 'memory' | 'stop' | 'trip';
}

const hasCoordinates = (location: {
  readonly latitude: number | null;
  readonly longitude: number | null;
}): location is { readonly latitude: number; readonly longitude: number } =>
  typeof location.latitude === 'number' && typeof location.longitude === 'number';

export const TravelAtlasShell = ({
  groups,
  memories,
  timeZone,
  tripLocations,
}: TravelAtlasShellProps): ReactElement => {
  const { format, t } = useI18n('ui.travelAtlas');
  const reduceMotion = useHydratedReducedMotion();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const atlasPlaces = useMemo(() => getAtlasPlaces(groups), [groups]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(atlasPlaces[0]?.id ?? '');
  const [unavailableMapPointsKey, setUnavailableMapPointsKey] = useState<string | null>(null);
  const selectedPlace =
    atlasPlaces.find((visitedPlace) => visitedPlace.id === selectedPlaceId) ?? atlasPlaces[0];
  const mapPoints: readonly MapMarkerPoint[] = useMemo(
    () => [
      ...atlasPlaces.flatMap((place) =>
        hasCoordinates(place.location)
          ? [
              {
                id: place.id,
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                title: place.title,
                type: 'stop' as const,
              },
            ]
          : [],
      ),
      ...tripLocations.flatMap((trip) =>
        hasCoordinates(trip.location)
          ? [
              {
                id: trip.id,
                latitude: trip.location.latitude,
                longitude: trip.location.longitude,
                title: trip.title,
                type: 'trip' as const,
              },
            ]
          : [],
      ),
      ...memories.flatMap((memory) =>
        hasCoordinates(memory.location) && memory.location.name
          ? [
              {
                id: memory.id,
                latitude: memory.location.latitude,
                longitude: memory.location.longitude,
                title: memory.location.name,
                type: 'memory' as const,
              },
            ]
          : [],
      ),
    ],
    [atlasPlaces, memories, tripLocations],
  );
  const mapPointsKey = useMemo(
    () =>
      mapPoints
        .map((point) => `${point.type}:${point.id}:${point.latitude}:${point.longitude}`)
        .join('|'),
    [mapPoints],
  );
  const isMapUnavailable = mapPointsKey.length > 0 && unavailableMapPointsKey === mapPointsKey;
  const shouldRenderMap = mapPoints.length > 0 && !isMapUnavailable;

  useEffect(() => {
    if (!mapContainerRef.current || !mapPoints.length || isMapUnavailable) {
      return;
    }

    const firstPoint = mapPoints[0];
    if (!firstPoint) {
      return;
    }

    let hasLoaded = false;
    let isDisposed = false;
    let map: MaplibreMap | null = null;

    // Load maplibre-gl (~200KB) only when a map actually renders, keeping it out
    // of the initial bundle for every other route.
    void (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      // Bail if the effect was cleaned up while the chunk loaded. Keep the
      // construct-and-assign below synchronous after this guard: introducing an
      // await between here and `map = mapInstance` would reopen a window where a
      // Map is created but never disposed.
      if (isDisposed || !mapContainerRef.current) {
        return;
      }

      const mapInstance = new maplibregl.Map({
        attributionControl: {
          compact: false,
        },
        center: [firstPoint.longitude, firstPoint.latitude],
        container: mapContainerRef.current,
        style: OPENFREEMAP_STYLE_URL,
        zoom: mapPoints.length === 1 ? 10 : 2,
      });
      map = mapInstance;
      const bounds = new maplibregl.LngLatBounds();

      mapInstance.on('load', () => {
        hasLoaded = true;
      });

      mapInstance.on('error', () => {
        if (!isDisposed && !hasLoaded) {
          setUnavailableMapPointsKey(mapPointsKey);
        }
      });

      mapPoints.forEach((point) => {
        bounds.extend([point.longitude, point.latitude]);
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.className =
          'size-5 rounded-full border-4 border-white bg-primary shadow-focus-rose';
        markerElement.setAttribute('aria-label', point.title);
        new maplibregl.Marker({ element: markerElement })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText(point.title))
          .addTo(mapInstance);
      });

      if (mapPoints.length > 1) {
        mapInstance.fitBounds(bounds, {
          maxZoom: 11,
          padding: 70,
        });
      }
    })();

    return () => {
      isDisposed = true;
      map?.remove();
    };
  }, [isMapUnavailable, mapPoints, mapPointsKey]);

  const formatDateLabel = (value: string): string =>
    format.dateTime(parseDateInputValueInTimeZone(value, timeZone), {
      day: 'numeric',
      month: 'short',
      timeZone,
      year: 'numeric',
    });
  const renderTripGroup = (group: MapTripGroup): ReactElement => (
    <section
      className="flex flex-col gap-3"
      key={group.trip.id}
    >
      <div className="rounded-panel border border-white/70 bg-bg-soft/72 px-4 py-3 shadow-whisper backdrop-blur-xl">
        <p className="ui-meta">
          {t('tripWindow', {
            end: formatDateLabel(group.trip.endDate),
            start: formatDateLabel(group.trip.startDate),
          })}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="ui-panel-title text-title-sm">{group.trip.title}</p>
            <p className="mt-1 text-xs font-semibold tracking-meta text-muted-foreground uppercase">
              {t(atlasTripStatusTranslationKeyByValue[group.trip.status])}
            </p>
          </div>
          <span className="rounded-pill border border-white/70 bg-white/72 px-3 py-1 text-2xs font-semibold tracking-meta text-muted-foreground uppercase shadow-whisper">
            {t('tripCount', { count: group.visitedPlaces.length })}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {group.visitedPlaces.map((visitedPlace) => {
          const isSelected = visitedPlace.id === selectedPlaceId;

          return (
            <button
              className={cn(
                'w-full rounded-panel border px-4 py-3 text-left shadow-whisper transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                isSelected
                  ? 'border-accent-blue/30 bg-accent-blue-soft text-accent-blue-strong'
                  : 'border-white/72 bg-white/72 text-foreground',
              )}
              key={visitedPlace.id}
              onClick={() => setSelectedPlaceId(visitedPlace.id)}
              type="button"
            >
              <p className="ui-meta">
                {t('visitedOn', {
                  date: formatDateLabel(visitedPlace.visitedOn),
                })}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{visitedPlace.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {visitedPlace.note?.trim() || t('noteFallback')}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <SectionCard
      className="flex flex-col gap-5 overflow-hidden"
      hoverLift={false}
      padding="comfortable"
      surface="hero"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[440px] overflow-hidden rounded-[calc(var(--radius-hero)-0.5rem)] border border-white/60 bg-[linear-gradient(160deg,#fff8f1_0%,#ffede8_48%,#f8d6d2_100%)]">
          {shouldRenderMap ? (
            <div
              className="absolute inset-0"
              ref={mapContainerRef}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-sm rounded-panel border border-white/70 bg-bg-soft/86 p-5 text-center shadow-whisper backdrop-blur-xl">
                <p className="ui-card-title">{t('mapFallback.title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t('mapFallback.description')}
                </p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-4 top-4 rounded-panel border border-white/70 bg-bg-soft/78 px-4 py-3 shadow-whisper backdrop-blur-xl md:inset-x-6">
            <p className="ui-meta ui-couple-mark">{t('header.eyebrow')}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="ui-card-title">{t('header.title')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('header.description')}</p>
              </div>
              <div className="rounded-pill border border-white/70 bg-white/72 px-4 py-2 text-xs font-semibold tracking-meta text-muted-foreground uppercase shadow-whisper">
                {t('header.badge', { count: atlasPlaces.length })}
              </div>
            </div>
          </div>

          {!shouldRenderMap
            ? atlasPlaces.map((visitedPlace, index) => {
                const isSelected = visitedPlace.id === selectedPlace?.id;
                const positionClassName =
                  ATLAS_POINT_POSITION_CLASS_NAMES[index % ATLAS_POINT_POSITION_CLASS_NAMES.length];

                return (
                  <button
                    aria-label={visitedPlace.title}
                    aria-pressed={isSelected}
                    className={cn('absolute', positionClassName)}
                    key={visitedPlace.id}
                    onClick={() => setSelectedPlaceId(visitedPlace.id)}
                    type="button"
                  >
                    <motion.span
                      animate={{ scale: !reduceMotion && isSelected ? 1.06 : 1 }}
                      className={cn(
                        'relative inline-flex flex-col items-center gap-2',
                        isSelected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                      }
                    >
                      <span
                        className={cn(
                          'inline-flex size-5 rounded-full border-4 border-white shadow-focus-rose-soft',
                          isSelected ? 'bg-accent-blue' : 'bg-primary/45',
                        )}
                      />
                      <span className="max-w-[11rem] rounded-pill border border-white/70 bg-bg-soft/84 px-3 py-1 text-center text-2xs font-semibold tracking-meta uppercase shadow-whisper backdrop-blur-lg">
                        {visitedPlace.title}
                      </span>
                    </motion.span>
                  </button>
                );
              })
            : null}

          {selectedPlace ? (
            <div
              className={cn(
                'absolute inset-x-4 rounded-memory border border-white/70 bg-bg-soft/90 px-4 py-4 shadow-cloud backdrop-blur-xl md:inset-x-6',
                shouldRenderMap ? 'bottom-10' : 'bottom-4',
              )}
            >
              <div className="flex items-center gap-2 text-primary">
                <MapPinned
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.1}
                />
                <p className="ui-meta">
                  {t('visitedOn', {
                    date: formatDateLabel(selectedPlace.visitedOn),
                  })}
                </p>
              </div>
              <p className="ui-panel-title mt-2">{selectedPlace.title}</p>
              <p className="mt-1 text-sm font-semibold text-foreground/80">
                {selectedPlace.trip.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selectedPlace.note?.trim() || t('noteFallback')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold tracking-meta text-muted-foreground uppercase">
                <span>{t(atlasTripStatusTranslationKeyByValue[selectedPlace.trip.status])}</span>
                <span>&bull;</span>
                <span>
                  {t('tripWindow', {
                    end: formatDateLabel(selectedPlace.trip.endDate),
                    start: formatDateLabel(selectedPlace.trip.startDate),
                  })}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden flex-col gap-4 xl:flex">
          <div className="rounded-memory border border-white/70 bg-bg-soft/78 px-5 py-4 shadow-whisper backdrop-blur-xl">
            <div className="flex items-center gap-2 text-primary">
              <Route
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              <p className="ui-meta">{t('side.eyebrow')}</p>
            </div>
            <p className="ui-card-title mt-2">{t('side.title')}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('side.description')}
            </p>
          </div>
          <div className="space-y-4">{groups.map((group) => renderTripGroup(group))}</div>
        </div>
      </div>

      <div className="space-y-4 xl:hidden">
        <div className="rounded-memory border border-white/70 bg-bg-soft/78 px-5 py-4 shadow-whisper backdrop-blur-xl">
          <div className="flex items-center gap-2 text-primary">
            <Route
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            <p className="ui-meta">{t('side.eyebrow')}</p>
          </div>
          <p className="ui-card-title mt-2">{t('side.title')}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t('side.description')}
          </p>
        </div>
        {groups.map((group) => renderTripGroup(group))}
      </div>
    </SectionCard>
  );
};
