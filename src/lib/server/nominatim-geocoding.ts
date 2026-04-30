import type { LocationDraft } from '@/lib/location/types';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const USER_RATE_LIMIT_MS = 1000;
const UPSTREAM_RATE_LIMIT_MS = 1000;
const MAX_CACHE_ENTRIES = 200;

type GeoSearchError = 'geo_provider_unavailable' | 'rate_limited';

interface NominatimAddress {
  readonly city?: string;
  readonly country?: string;
  readonly county?: string;
  readonly hamlet?: string;
  readonly municipality?: string;
  readonly neighbourhood?: string;
  readonly road?: string;
  readonly state?: string;
  readonly suburb?: string;
  readonly town?: string;
  readonly village?: string;
}

export interface NominatimPlace {
  readonly address?: NominatimAddress;
  readonly display_name?: string;
  readonly lat?: string;
  readonly lon?: string;
  readonly name?: string;
  readonly osm_id?: number;
  readonly osm_type?: string;
  readonly place_id?: number;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly locations: readonly LocationDraft[];
}

interface SearchNominatimLocationsOptions {
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
  readonly query: string;
  readonly siteUrl: string;
  readonly userId: string;
}

interface SearchNominatimLocationsResult {
  readonly error?: GeoSearchError;
  readonly locations: readonly LocationDraft[];
}

const locationCache = new Map<string, CacheEntry>();
const userLastRequestAt = new Map<string, number>();
let lastUpstreamRequestAt = 0;

export const normalizeGeoSearchQuery = (query: string): string =>
  query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const getProviderId = (place: NominatimPlace): string | null => {
  if (place.osm_type && typeof place.osm_id === 'number') {
    return `${place.osm_type}:${place.osm_id}`;
  }

  return typeof place.place_id === 'number' ? String(place.place_id) : null;
};

const getPlaceName = (place: NominatimPlace): string | null => {
  const addressName =
    place.address?.city ??
    place.address?.town ??
    place.address?.village ??
    place.address?.municipality ??
    place.address?.hamlet ??
    place.address?.suburb ??
    place.address?.neighbourhood ??
    place.address?.road ??
    place.address?.county ??
    place.address?.state ??
    place.address?.country;
  const displayName = place.display_name?.split(',')[0]?.trim();
  const name = place.name?.trim() || addressName?.trim() || displayName || null;

  return name && name.length > 0 ? name : null;
};

export const toLocationDraft = (place: NominatimPlace): LocationDraft | null => {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  const providerId = getProviderId(place);
  const name = getPlaceName(place);

  if (
    !providerId ||
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    address: place.display_name?.trim() || null,
    latitude,
    longitude,
    name,
    provider: 'nominatim',
    providerId,
  };
};

const rememberCacheEntry = (
  cacheKey: string,
  locations: readonly LocationDraft[],
  now: number,
): void => {
  if (locationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = locationCache.keys().next().value as string | undefined;
    if (oldestKey) {
      locationCache.delete(oldestKey);
    }
  }

  locationCache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    locations,
  });
};

const getCachedLocations = (cacheKey: string, now: number): readonly LocationDraft[] | null => {
  const entry = locationCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    locationCache.delete(cacheKey);
    return null;
  }

  return entry.locations;
};

const isRateLimited = (userId: string, now: number): boolean => {
  const userLastRequest = userLastRequestAt.get(userId) ?? 0;

  return (
    now - userLastRequest < USER_RATE_LIMIT_MS ||
    now - lastUpstreamRequestAt < UPSTREAM_RATE_LIMIT_MS
  );
};

export const searchNominatimLocations = async ({
  fetchImpl = fetch,
  now: getNow = Date.now,
  query,
  siteUrl,
  userId,
}: SearchNominatimLocationsOptions): Promise<SearchNominatimLocationsResult> => {
  const cacheKey = normalizeGeoSearchQuery(query);
  if (cacheKey.length < 2) {
    return { locations: [] };
  }

  const now = getNow();
  const cachedLocations = getCachedLocations(cacheKey, now);
  if (cachedLocations) {
    return { locations: cachedLocations };
  }

  if (isRateLimited(userId, now)) {
    return { error: 'rate_limited', locations: [] };
  }

  userLastRequestAt.set(userId, now);
  lastUpstreamRequestAt = now;

  const searchUrl = new URL(NOMINATIM_SEARCH_URL);
  searchUrl.searchParams.set('addressdetails', '1');
  searchUrl.searchParams.set('format', 'jsonv2');
  searchUrl.searchParams.set('limit', '5');
  searchUrl.searchParams.set('q', cacheKey);

  try {
    const response = await fetchImpl(searchUrl, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Referer: siteUrl,
        'User-Agent': `PhuocAnh/0.1 (${siteUrl})`,
      },
    });

    if (!response.ok) {
      console.error('Nominatim geocoding request failed', response.status);
      return { error: 'geo_provider_unavailable', locations: [] };
    }

    const places = (await response.json()) as readonly NominatimPlace[];
    const locations = places.flatMap((place) => {
      const location = toLocationDraft(place);
      return location ? [location] : [];
    });

    rememberCacheEntry(cacheKey, locations, now);

    return { locations };
  } catch (error: unknown) {
    console.error('Nominatim geocoding request failed', error);
    return { error: 'geo_provider_unavailable', locations: [] };
  }
};

export const resetNominatimGeocodingStateForTests = (): void => {
  locationCache.clear();
  userLastRequestAt.clear();
  lastUpstreamRequestAt = 0;
};
