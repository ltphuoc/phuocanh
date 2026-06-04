'use client';

import type { ReactElement } from 'react';
import type { LocationDraft, LocationProvider, StoredLocation } from '@/lib/location/types';

import { useEffect, useId, useRef, useState } from 'react';

import { MapPin, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils/cn';

interface LocationPickerProps {
  readonly defaultLocation?: StoredLocation | null;
  readonly inputId?: string;
  readonly placeholder?: string;
  readonly searchingLabel: string;
}

const toSupportedLocationProvider = (provider: string | null): LocationProvider | null =>
  provider === 'mapbox' || provider === 'nominatim' ? provider : null;

const toInitialLocation = (location: StoredLocation | null | undefined): LocationDraft | null => {
  const provider = toSupportedLocationProvider(location?.provider ?? null);
  if (!location?.name || !location.providerId || !provider) {
    return null;
  }

  return {
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    provider,
    providerId: location.providerId,
  };
};

export const LocationPicker = ({
  defaultLocation,
  inputId,
  placeholder,
  searchingLabel,
}: LocationPickerProps): ReactElement => {
  const { t } = useI18n('forms.locationSearch');
  const fallbackId = useId();
  const id = inputId ?? fallbackId;
  const statusId = `${id}-status`;
  const abortControllerRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(defaultLocation?.name ?? '');
  const [selectedLocation, setSelectedLocation] = useState<LocationDraft | null>(
    toInitialLocation(defaultLocation),
  );
  const [results, setResults] = useState<LocationDraft[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const searchLocations = async (): Promise<void> => {
    const trimmedQuery = query.trim();
    setHasSearched(true);
    setSearchError(null);
    setResults([]);

    if (trimmedQuery.length < 2) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmedQuery)}`, {
        headers: {
          Accept: 'application/json',
        },
        signal: abortController.signal,
      });
      const data = (await response.json()) as { error?: string; locations?: LocationDraft[] };

      if (!response.ok || data.error) {
        setSearchError(data.error ?? 'geo_provider_unavailable');
        return;
      }

      setResults(data.locations ?? []);
    } catch (error: unknown) {
      if (!abortController.signal.aborted) {
        console.error('Failed to search locations', error);
        setSearchError('geo_provider_unavailable');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  const selectLocation = (location: LocationDraft): void => {
    setQuery(location.name);
    setSelectedLocation(location);
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
  };

  const clearSelectedLocationForFreeText = (value: string): void => {
    setQuery(value);
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    if (selectedLocation && selectedLocation.name !== value) {
      setSelectedLocation(null);
    }
  };

  const statusMessage = isSearching
    ? searchingLabel
    : searchError
      ? t(searchError === 'rate_limited' ? 'rateLimited' : 'unavailable')
      : hasSearched && !results.length && query.trim().length >= 2
        ? t('noResults')
        : null;

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          aria-describedby={statusMessage ? statusId : undefined}
          autoComplete="off"
          id={id}
          name="locationName"
          onChange={(event) => clearSelectedLocationForFreeText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void searchLocations();
            }
          }}
          placeholder={placeholder}
          type="text"
          value={query}
        />
        <Button
          aria-label={t('submit')}
          busyLabel={searchingLabel}
          className="shrink-0 px-4"
          disabled={query.trim().length < 2}
          isBusy={isSearching}
          onClick={() => void searchLocations()}
          type="button"
          variant="outline"
        >
          <Search
            aria-hidden="true"
            className="size-4"
            strokeWidth={2.1}
          />
          <span className="hidden sm:inline">{t('submit')}</span>
        </Button>
      </div>
      <input
        name="locationAddress"
        type="hidden"
        value={selectedLocation?.address ?? ''}
      />
      <input
        name="locationLatitude"
        type="hidden"
        value={selectedLocation?.latitude ?? ''}
      />
      <input
        name="locationLongitude"
        type="hidden"
        value={selectedLocation?.longitude ?? ''}
      />
      <input
        name="locationProvider"
        type="hidden"
        value={selectedLocation?.provider ?? ''}
      />
      <input
        name="locationProviderId"
        type="hidden"
        value={selectedLocation?.providerId ?? ''}
      />

      {results.length ? (
        <div className="absolute z-30 mt-2 max-h-[16rem] w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-panel border border-white/72 bg-white/95 shadow-cloud backdrop-blur-xl">
          {results.map((location) => (
            <button
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-primary/8 focus-visible:bg-primary/8 focus-visible:outline-none',
                selectedLocation?.providerId === location.providerId ? 'bg-primary/8' : null,
              )}
              key={location.providerId}
              onClick={() => selectLocation(location)}
              type="button"
            >
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={2.1}
              />
              <span className="min-w-0">
                <span className="block font-semibold break-words text-foreground">
                  {location.name}
                </span>
                {location.address ? (
                  <span className="mt-1 block text-xs break-words text-muted-foreground">
                    {location.address}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {statusMessage ? (
        <p
          aria-live="polite"
          className="mt-2 text-xs font-medium text-muted-foreground"
          id={statusId}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
};
