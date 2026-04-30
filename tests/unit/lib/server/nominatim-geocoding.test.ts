import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  resetNominatimGeocodingStateForTests,
  searchNominatimLocations,
  toLocationDraft,
} from '@/lib/server/nominatim-geocoding';

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });

describe('nominatim geocoding', () => {
  beforeEach(() => {
    resetNominatimGeocodingStateForTests();
  });

  test('normalizes an OSM-backed search result', () => {
    expect(
      toLocationDraft({
        display_name: 'Hoi An, Quang Nam, Vietnam',
        lat: '15.8801',
        lon: '108.338',
        name: 'Hoi An',
        osm_id: 12345,
        osm_type: 'relation',
        place_id: 6789,
      }),
    ).toEqual({
      address: 'Hoi An, Quang Nam, Vietnam',
      latitude: 15.8801,
      longitude: 108.338,
      name: 'Hoi An',
      provider: 'nominatim',
      providerId: 'relation:12345',
    });
  });

  test('falls back to place id when OSM source id is unavailable', () => {
    expect(
      toLocationDraft({
        display_name: 'Da Nang, Vietnam',
        lat: '16.0544',
        lon: '108.2022',
        place_id: 9988,
      })?.providerId,
    ).toBe('9988');
  });

  test('serves cached query results without a second upstream request', async () => {
    let now = 10_000;
    const fetchImpl = vi.fn(async () =>
      createJsonResponse([
        {
          display_name: 'Hoi An, Quang Nam, Vietnam',
          lat: '15.8801',
          lon: '108.338',
          name: 'Hoi An',
          osm_id: 12345,
          osm_type: 'relation',
        },
      ]),
    ) as unknown as typeof fetch;

    const firstResult = await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: '  Hoi   An  ',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });
    now += 100;
    const secondResult = await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: 'hoi an',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });

    expect(firstResult.locations).toHaveLength(1);
    expect(secondResult.locations).toEqual(firstResult.locations);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('rate limits repeated uncached searches from one user', async () => {
    let now = 20_000;
    const fetchImpl = vi.fn(async () => createJsonResponse([])) as unknown as typeof fetch;

    await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: 'Da Nang',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });
    now += 500;
    const result = await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: 'Hue',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });

    expect(result).toEqual({ error: 'rate_limited', locations: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('rate limits uncached upstream searches across different users', async () => {
    let now = 30_000;
    const fetchImpl = vi.fn(async () => createJsonResponse([])) as unknown as typeof fetch;

    await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: 'Da Nang',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });
    now += 500;
    const result = await searchNominatimLocations({
      fetchImpl,
      now: () => now,
      query: 'Hue',
      siteUrl: 'http://localhost:3000',
      userId: 'user-two',
    });

    expect(result).toEqual({ error: 'rate_limited', locations: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('returns a safe unavailable error for non-OK upstream responses', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ error: 'upstream unavailable' }, 503),
    ) as unknown as typeof fetch;

    const result = await searchNominatimLocations({
      fetchImpl,
      now: () => 40_000,
      query: 'Hoi An',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });

    expect(result).toEqual({ error: 'geo_provider_unavailable', locations: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('filters invalid and out-of-range upstream coordinates', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse([
        {
          display_name: 'Invalid Latitude, Vietnam',
          lat: '91',
          lon: '108.338',
          name: 'Invalid Latitude',
          osm_id: 111,
          osm_type: 'node',
        },
        {
          display_name: 'Invalid Longitude, Vietnam',
          lat: '15.8801',
          lon: '181',
          name: 'Invalid Longitude',
          osm_id: 222,
          osm_type: 'node',
        },
        {
          display_name: 'Not Numeric, Vietnam',
          lat: 'not-a-number',
          lon: '108.338',
          name: 'Not Numeric',
          osm_id: 333,
          osm_type: 'node',
        },
        {
          display_name: 'Hoi An, Quang Nam, Vietnam',
          lat: '15.8801',
          lon: '108.338',
          name: 'Hoi An',
          osm_id: 12345,
          osm_type: 'relation',
        },
      ]),
    ) as unknown as typeof fetch;

    const result = await searchNominatimLocations({
      fetchImpl,
      now: () => 50_000,
      query: 'Hoi An',
      siteUrl: 'http://localhost:3000',
      userId: 'user-one',
    });

    expect(result.locations).toEqual([
      {
        address: 'Hoi An, Quang Nam, Vietnam',
        latitude: 15.8801,
        longitude: 108.338,
        name: 'Hoi An',
        provider: 'nominatim',
        providerId: 'relation:12345',
      },
    ]);
  });
});
