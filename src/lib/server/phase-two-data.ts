import type { StoredLocation } from '@/lib/location/types';
import type { CoupleContext } from '@/lib/server/couple-context';
import type { Database } from '@/lib/supabase/database.types';

import { compareAsc, parseISO } from 'date-fns';
import { z } from 'zod';

import { signMemoryMediaStorageItems } from '@/lib/server/memory-media';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCurrentDateTokenInTimeZone,
  getDateTokenForInstantInTimeZone,
  getDaysBetweenDateTokens,
  toTimeZoneDateEndExclusiveIso,
  toTimeZoneDateStartIso,
} from '@/lib/utils/couple-timezone';

export type TripStatus = 'planned' | 'active' | 'completed';
type AlbumItemRow = Database['public']['Tables']['album_items']['Row'];
type MemoryMediaRow = Database['public']['Tables']['memory_media']['Row'];

// Defensive ceiling for the unbounded couple-scoped list reads behind the map and
// albums pages. A single couple realistically holds far fewer rows than this, so the
// cap never truncates real data; it just stops a pathological row count from loading
// the whole table into memory at once. This is a safety net, not real pagination —
// keyset/viewport paging is deferred until a couple's volume warrants it.
const COUPLE_LIST_SAFETY_LIMIT = 500;

export interface CountdownCard {
  readonly daysFromToday: number;
  readonly id: string;
  readonly kind: Database['public']['Enums']['countdown_kind'];
  readonly note: string | null;
  readonly targetAt: string;
  readonly title: string;
}

export interface CountdownsPageData {
  readonly past: readonly CountdownCard[];
  readonly upcoming: readonly CountdownCard[];
}

export interface LockedFutureNoteCard {
  readonly id: string;
  readonly status: 'locked';
  readonly title: string;
  readonly unlockAt: string;
}

export interface UnlockedFutureNoteCard {
  readonly body: string | null;
  readonly id: string;
  readonly status: 'unlocked';
  readonly title: string;
  readonly unlockAt: string;
}

export interface FutureNotesPageData {
  readonly locked: readonly LockedFutureNoteCard[];
  readonly unlocked: readonly UnlockedFutureNoteCard[];
}

export interface TripCard {
  readonly endDate: string;
  readonly id: string;
  readonly location: StoredLocation;
  readonly locationName: string | null;
  readonly note: string | null;
  readonly startDate: string;
  readonly status: TripStatus;
  readonly title: string;
}

export interface TripsPageData {
  readonly active: readonly TripCard[];
  readonly completed: readonly TripCard[];
  readonly planned: readonly TripCard[];
}

export interface VisitedPlaceCard {
  readonly id: string;
  readonly location: StoredLocation;
  readonly note: string | null;
  readonly title: string;
  readonly visitedOn: string;
}

export interface TripVisitedPlaceCard extends VisitedPlaceCard {
  readonly trip: TripCard;
}

export interface MapTripGroup {
  readonly trip: TripCard;
  readonly visitedPlaces: readonly VisitedPlaceCard[];
}

export interface MapPageData {
  readonly memories: readonly MapMemoryPlace[];
  readonly tripLocations: readonly TripCard[];
  readonly trips: readonly MapTripGroup[];
  readonly visitedPlaces: readonly TripVisitedPlaceCard[];
}

export interface MapMemoryPlace {
  readonly happenedAt: string;
  readonly id: string;
  readonly location: StoredLocation;
  readonly note: string | null;
}

export interface AlbumSummary {
  readonly coverMediaType: Database['public']['Enums']['media_type'] | null;
  readonly coverSignedUrl: string | null;
  readonly description: string | null;
  readonly id: string;
  readonly itemCount: number;
  readonly title: string;
  readonly trip: TripCard;
}

export interface AlbumsPageData {
  readonly albums: readonly AlbumSummary[];
}

export interface AlbumMediaCandidate {
  readonly happenedAt: string;
  readonly id: string;
  readonly location: StoredLocation;
  readonly locationName: string | null;
  readonly mediaType: Database['public']['Enums']['media_type'];
  readonly note: string | null;
  readonly signedUrl: string | null;
}

export interface TripDetailAlbumSummary {
  readonly coverMediaType: Database['public']['Enums']['media_type'] | null;
  readonly coverSignedUrl: string | null;
  readonly description: string | null;
  readonly id: string;
  readonly itemCount: number;
  readonly title: string;
}

export interface TripDetailData extends TripCard {
  readonly album: TripDetailAlbumSummary | null;
  readonly availableMedia: readonly AlbumMediaCandidate[];
  readonly visitedPlaces: readonly VisitedPlaceCard[];
}

export interface AlbumDetailData {
  readonly description: string | null;
  readonly id: string;
  readonly items: readonly AlbumMediaCandidate[];
  readonly title: string;
  readonly trip: TripCard;
}

const albumIdSchema = z.uuid();
const tripIdSchema = z.uuid();

const compareDateTokensAscending = (left: string, right: string): number =>
  compareAsc(parseISO(left), parseISO(right));

const compareDateTokensDescending = (left: string, right: string): number =>
  compareAsc(parseISO(right), parseISO(left));

const getTripStatus = (startDate: string, endDate: string, todayDateToken: string): TripStatus => {
  if (todayDateToken < startDate) {
    return 'planned';
  }

  if (todayDateToken > endDate) {
    return 'completed';
  }

  return 'active';
};

const toCountdownCard = (
  row: Database['public']['Tables']['countdowns']['Row'],
  todayDateToken: string,
  timeZone: string,
): CountdownCard => {
  const targetDateToken = getDateTokenForInstantInTimeZone(row.target_at, timeZone);

  return {
    daysFromToday: getDaysBetweenDateTokens(targetDateToken, todayDateToken),
    id: row.id,
    kind: row.kind,
    note: row.note,
    targetAt: row.target_at,
    title: row.title,
  };
};

const toTripCard = (
  row: Database['public']['Tables']['trips']['Row'],
  todayDateToken: string,
): TripCard => ({
  endDate: row.end_date,
  id: row.id,
  location: {
    address: row.location_address,
    latitude: row.location_latitude,
    longitude: row.location_longitude,
    name: row.location_name,
    provider: row.location_provider,
    providerId: row.location_provider_id,
  },
  locationName: row.location_name,
  note: row.note,
  startDate: row.start_date,
  status: getTripStatus(row.start_date, row.end_date, todayDateToken),
  title: row.title,
});

const toAlbumMediaCandidate = (
  media: Database['public']['Tables']['memory_media']['Row'] & {
    readonly signedUrl: string | null;
  },
  memory: Database['public']['Tables']['memories']['Row'],
): AlbumMediaCandidate => ({
  happenedAt: memory.happened_at,
  id: media.id,
  location: {
    address: memory.location_address,
    latitude: memory.location_latitude,
    longitude: memory.location_longitude,
    name: memory.location_name,
    provider: memory.location_provider,
    providerId: memory.location_provider_id,
  },
  locationName: memory.location_name,
  mediaType: media.media_type,
  note: memory.note,
  signedUrl: media.signedUrl,
});

const toVisitedPlaceCard = (
  row: Database['public']['Tables']['visited_places']['Row'],
): VisitedPlaceCard => ({
  id: row.id,
  location: {
    address: row.location_address,
    latitude: row.location_latitude,
    longitude: row.location_longitude,
    name: row.title,
    provider: row.location_provider,
    providerId: row.location_provider_id,
  },
  note: row.note,
  title: row.title,
  visitedOn: row.visited_on,
});

const toVisitedPlaceSummaryCard = (visitedPlace: TripVisitedPlaceCard): VisitedPlaceCard => ({
  id: visitedPlace.id,
  location: visitedPlace.location,
  note: visitedPlace.note,
  title: visitedPlace.title,
  visitedOn: visitedPlace.visitedOn,
});

const sortAlbumMediaCandidates = (left: AlbumMediaCandidate, right: AlbumMediaCandidate): number =>
  compareAsc(parseISO(right.happenedAt), parseISO(left.happenedAt));

export const getCountdownsPageData = async (
  context: CoupleContext,
): Promise<CountdownsPageData> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('countdowns')
    .select('*')
    .eq('couple_id', context.coupleId)
    .order('target_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const countdowns = data.map((row) => toCountdownCard(row, todayDateToken, context.timezone));

  return {
    past: countdowns
      .filter((countdown) => countdown.daysFromToday < 0)
      .sort((left, right) => compareAsc(parseISO(right.targetAt), parseISO(left.targetAt))),
    upcoming: countdowns
      .filter((countdown) => countdown.daysFromToday >= 0)
      .sort((left, right) => compareAsc(parseISO(left.targetAt), parseISO(right.targetAt))),
  };
};

export const getFutureNotesPageData = async (
  context: CoupleContext,
): Promise<FutureNotesPageData> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('future_notes')
    .select('*')
    .eq('couple_id', context.coupleId)
    .order('unlock_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const now = new Date();
  const unlockedMetadata = data.filter((note) => compareAsc(parseISO(note.unlock_at), now) <= 0);
  const locked = data
    .filter((note) => compareAsc(parseISO(note.unlock_at), now) > 0)
    .map<LockedFutureNoteCard>((note) => ({
      id: note.id,
      status: 'locked',
      title: note.title,
      unlockAt: note.unlock_at,
    }));

  const unlockedIds = unlockedMetadata.map((note) => note.id);
  const unlockedIdSet = new Set(unlockedIds);
  const unlockedContentsQuery = unlockedIds.length
    ? await supabase.rpc('get_unlocked_future_note_contents', {
        target_couple_id: context.coupleId,
      })
    : { data: [], error: null };

  if (unlockedContentsQuery.error) {
    throw new Error(unlockedContentsQuery.error.message);
  }

  const bodyByNoteId = new Map<string, string>();
  unlockedContentsQuery.data
    .filter((content) => unlockedIdSet.has(content.future_note_id))
    .forEach((content) => {
      bodyByNoteId.set(content.future_note_id, content.body);
    });

  return {
    locked,
    unlocked: unlockedMetadata
      .map<UnlockedFutureNoteCard>((note) => ({
        body: bodyByNoteId.get(note.id) ?? null,
        id: note.id,
        status: 'unlocked',
        title: note.title,
        unlockAt: note.unlock_at,
      }))
      .sort((left, right) => compareAsc(parseISO(right.unlockAt), parseISO(left.unlockAt))),
  };
};

export const getTripsPageData = async (context: CoupleContext): Promise<TripsPageData> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('couple_id', context.coupleId)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const trips = data.map((row) => toTripCard(row, todayDateToken));

  return {
    active: trips
      .filter((trip) => trip.status === 'active')
      .sort((left, right) => compareDateTokensAscending(left.endDate, right.endDate)),
    completed: trips
      .filter((trip) => trip.status === 'completed')
      .sort((left, right) => compareDateTokensDescending(left.endDate, right.endDate)),
    planned: trips
      .filter((trip) => trip.status === 'planned')
      .sort((left, right) => compareDateTokensAscending(left.startDate, right.startDate)),
  };
};

export const getMapPageData = async (context: CoupleContext): Promise<MapPageData> => {
  const supabase = await createSupabaseServerClient();
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);

  // visited_places and the located memories/trips are independent of each other,
  // so issue them concurrently instead of waterfalling. The trips-by-id lookup
  // below still depends on visited_places and stays sequential.
  const [visitedPlacesResult, memoryResult, locatedTripsResult] = await Promise.all([
    supabase
      .from('visited_places')
      .select('*')
      .eq('couple_id', context.coupleId)
      .order('visited_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(COUPLE_LIST_SAFETY_LIMIT),
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', context.coupleId)
      .not('location_latitude', 'is', null)
      .not('location_longitude', 'is', null)
      .order('happened_at', { ascending: false })
      .limit(COUPLE_LIST_SAFETY_LIMIT),
    supabase
      .from('trips')
      .select('*')
      .eq('couple_id', context.coupleId)
      .not('location_latitude', 'is', null)
      .not('location_longitude', 'is', null)
      .order('start_date', { ascending: false })
      .limit(COUPLE_LIST_SAFETY_LIMIT),
  ]);

  if (visitedPlacesResult.error) {
    throw new Error(visitedPlacesResult.error.message);
  }

  if (memoryResult.error) {
    throw new Error(memoryResult.error.message);
  }

  if (locatedTripsResult.error) {
    throw new Error(locatedTripsResult.error.message);
  }

  const visitedPlaceRows = visitedPlacesResult.data;
  const mappedMemories = memoryResult.data.map((memory) => ({
    happenedAt: memory.happened_at,
    id: memory.id,
    location: {
      address: memory.location_address,
      latitude: memory.location_latitude,
      longitude: memory.location_longitude,
      name: memory.location_name,
      provider: memory.location_provider,
      providerId: memory.location_provider_id,
    },
    note: memory.note,
  }));
  const mappedTripLocations = locatedTripsResult.data.map((trip) =>
    toTripCard(trip, todayDateToken),
  );

  if (!visitedPlaceRows.length) {
    return {
      memories: mappedMemories,
      tripLocations: mappedTripLocations,
      trips: [],
      visitedPlaces: [],
    };
  }

  const tripIds = Array.from(new Set(visitedPlaceRows.map((visitedPlace) => visitedPlace.trip_id)));
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .in('id', tripIds);

  if (tripsError) {
    throw new Error(tripsError.message);
  }

  const tripById = new Map(
    trips.map((trip) => [trip.id, toTripCard(trip, todayDateToken)] as const),
  );
  const visitedPlaces = visitedPlaceRows.map<TripVisitedPlaceCard>((visitedPlace) => {
    const trip = tripById.get(visitedPlace.trip_id);
    if (!trip) {
      throw new Error(
        `Trip ${visitedPlace.trip_id} not found for visited place ${visitedPlace.id}.`,
      );
    }

    return {
      ...toVisitedPlaceCard(visitedPlace),
      trip,
    };
  });
  const tripsById = new Map<string, { trip: TripCard; visitedPlaces: VisitedPlaceCard[] }>();

  visitedPlaces.forEach((visitedPlace) => {
    const existingGroup = tripsById.get(visitedPlace.trip.id);
    const nextVisitedPlace = toVisitedPlaceSummaryCard(visitedPlace);

    if (existingGroup) {
      existingGroup.visitedPlaces.push(nextVisitedPlace);
      return;
    }

    tripsById.set(visitedPlace.trip.id, {
      trip: visitedPlace.trip,
      visitedPlaces: [nextVisitedPlace],
    });
  });

  return {
    memories: mappedMemories,
    tripLocations: mappedTripLocations,
    trips: Array.from(tripsById.values()),
    visitedPlaces,
  };
};

export const getAlbumsPageData = async (context: CoupleContext): Promise<AlbumsPageData> => {
  const supabase = await createSupabaseServerClient();
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const { data: albums, error } = await supabase
    .from('albums')
    .select('*')
    .eq('couple_id', context.coupleId)
    .order('created_at', { ascending: false })
    .limit(COUPLE_LIST_SAFETY_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  if (!albums.length) {
    return {
      albums: [],
    };
  }

  const albumIds = albums.map((album) => album.id);
  const tripIds = albums.map((album) => album.trip_id);
  const [albumItemsQuery, tripsQuery] = await Promise.all([
    supabase
      .from('album_items')
      .select('*')
      .in('album_id', albumIds)
      .order('position', { ascending: true }),
    supabase.from('trips').select('*').in('id', tripIds),
  ]);

  if (albumItemsQuery.error) {
    throw new Error(albumItemsQuery.error.message);
  }

  if (tripsQuery.error) {
    throw new Error(tripsQuery.error.message);
  }

  const firstAlbumItemByAlbumId = new Map<
    string,
    Database['public']['Tables']['album_items']['Row']
  >();
  const itemCountByAlbumId = new Map<string, number>();
  albumItemsQuery.data.forEach((item) => {
    if (!firstAlbumItemByAlbumId.has(item.album_id)) {
      firstAlbumItemByAlbumId.set(item.album_id, item);
    }

    itemCountByAlbumId.set(item.album_id, (itemCountByAlbumId.get(item.album_id) ?? 0) + 1);
  });

  const coverMediaIds = Array.from(firstAlbumItemByAlbumId.values()).map(
    (item) => item.memory_media_id,
  );
  const coverMediaQuery = coverMediaIds.length
    ? await supabase.from('memory_media').select('*').in('id', coverMediaIds)
    : { data: [], error: null };

  if (coverMediaQuery.error) {
    throw new Error(coverMediaQuery.error.message);
  }

  const signedCoverMedia = await signMemoryMediaStorageItems(coverMediaQuery.data);
  const coverMediaById = new Map(signedCoverMedia.map((media) => [media.id, media] as const));
  const tripById = new Map(
    tripsQuery.data.map((trip) => [trip.id, toTripCard(trip, todayDateToken)] as const),
  );

  return {
    albums: albums.map((album) => {
      const trip = tripById.get(album.trip_id);
      if (!trip) {
        throw new Error(`Trip ${album.trip_id} not found for album ${album.id}.`);
      }

      const firstAlbumItem = firstAlbumItemByAlbumId.get(album.id);
      const coverMedia = firstAlbumItem
        ? (coverMediaById.get(firstAlbumItem.memory_media_id) ?? null)
        : null;

      return {
        coverMediaType: coverMedia?.media_type ?? null,
        coverSignedUrl: coverMedia?.signedUrl ?? null,
        description: album.description,
        id: album.id,
        itemCount: itemCountByAlbumId.get(album.id) ?? 0,
        title: album.title,
        trip,
      };
    }),
  };
};

export const getTripDetailData = async (
  context: CoupleContext,
  tripId: string,
): Promise<TripDetailData | null> => {
  const parsedTripId = tripIdSchema.safeParse(tripId);
  if (!parsedTripId.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('couple_id', context.coupleId)
    .eq('id', parsedTripId.data)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const trip = trips[0];
  if (!trip) {
    return null;
  }

  const [albumQuery, memoriesQuery, visitedPlacesQuery] = await Promise.all([
    supabase
      .from('albums')
      .select('*')
      .eq('couple_id', context.coupleId)
      .eq('trip_id', trip.id)
      .limit(1),
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', context.coupleId)
      .gte('happened_at', toTimeZoneDateStartIso(trip.start_date, context.timezone))
      .lt('happened_at', toTimeZoneDateEndExclusiveIso(trip.end_date, context.timezone))
      .order('happened_at', { ascending: false }),
    supabase
      .from('visited_places')
      .select('*')
      .eq('couple_id', context.coupleId)
      .eq('trip_id', trip.id)
      .order('visited_on', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (albumQuery.error) {
    throw new Error(albumQuery.error.message);
  }

  if (memoriesQuery.error) {
    throw new Error(memoriesQuery.error.message);
  }

  if (visitedPlacesQuery.error) {
    throw new Error(visitedPlacesQuery.error.message);
  }

  const album = albumQuery.data[0] ?? null;
  const memoryIds = memoriesQuery.data.map((memory) => memory.id);
  const [eligibleMediaQuery, albumItemsQuery] = await Promise.all([
    memoryIds.length
      ? supabase
          .from('memory_media')
          .select('*')
          .in('memory_id', memoryIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as MemoryMediaRow[], error: null }),
    album
      ? supabase
          .from('album_items')
          .select('*')
          .eq('album_id', album.id)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] as AlbumItemRow[], error: null }),
  ]);

  if (eligibleMediaQuery.error) {
    throw new Error(eligibleMediaQuery.error.message);
  }

  if (albumItemsQuery.error) {
    throw new Error(albumItemsQuery.error.message);
  }

  const signedEligibleMedia = await signMemoryMediaStorageItems(eligibleMediaQuery.data);
  const eligibleMediaById = new Map(signedEligibleMedia.map((media) => [media.id, media] as const));
  const memoryById = new Map(memoriesQuery.data.map((memory) => [memory.id, memory] as const));
  const attachedMediaIds = new Set(albumItemsQuery.data.map((item) => item.memory_media_id));
  const availableMedia = signedEligibleMedia
    .filter((media) => !attachedMediaIds.has(media.id))
    .flatMap((media) => {
      const memory = memoryById.get(media.memory_id);
      if (!memory) {
        return [];
      }

      return [toAlbumMediaCandidate(media, memory)];
    })
    .sort(sortAlbumMediaCandidates);

  const firstAlbumItem = albumItemsQuery.data[0] ?? null;
  const coverMedia = firstAlbumItem
    ? (eligibleMediaById.get(firstAlbumItem.memory_media_id) ?? null)
    : null;

  return {
    album: album
      ? {
          coverMediaType: coverMedia?.media_type ?? null,
          coverSignedUrl: coverMedia?.signedUrl ?? null,
          description: album.description,
          id: album.id,
          itemCount: albumItemsQuery.data.length,
          title: album.title,
        }
      : null,
    availableMedia,
    visitedPlaces: visitedPlacesQuery.data.map((visitedPlace) => toVisitedPlaceCard(visitedPlace)),
    ...toTripCard(trip, todayDateToken),
  };
};

export const getAlbumDetailData = async (
  context: CoupleContext,
  albumId: string,
): Promise<AlbumDetailData | null> => {
  const parsedAlbumId = albumIdSchema.safeParse(albumId);
  if (!parsedAlbumId.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const { data: albums, error } = await supabase
    .from('albums')
    .select('*')
    .eq('couple_id', context.coupleId)
    .eq('id', parsedAlbumId.data)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const album = albums[0];
  if (!album) {
    return null;
  }

  const [tripQuery, albumItemsQuery] = await Promise.all([
    supabase
      .from('trips')
      .select('*')
      .eq('couple_id', context.coupleId)
      .eq('id', album.trip_id)
      .limit(1),
    supabase
      .from('album_items')
      .select('*')
      .eq('album_id', album.id)
      .order('position', { ascending: true }),
  ]);

  if (tripQuery.error) {
    throw new Error(tripQuery.error.message);
  }

  if (albumItemsQuery.error) {
    throw new Error(albumItemsQuery.error.message);
  }

  const trip = tripQuery.data[0];
  if (!trip) {
    return null;
  }

  const mediaIds = albumItemsQuery.data.map((item) => item.memory_media_id);
  const mediaQuery = mediaIds.length
    ? await supabase.from('memory_media').select('*').in('id', mediaIds)
    : { data: [], error: null };

  if (mediaQuery.error) {
    throw new Error(mediaQuery.error.message);
  }

  const memoryIds = mediaQuery.data.map((media) => media.memory_id);
  const memoriesQuery = memoryIds.length
    ? await supabase.from('memories').select('*').in('id', memoryIds)
    : { data: [], error: null };

  if (memoriesQuery.error) {
    throw new Error(memoriesQuery.error.message);
  }

  const signedMedia = await signMemoryMediaStorageItems(mediaQuery.data);
  const mediaById = new Map(signedMedia.map((media) => [media.id, media] as const));
  const memoryById = new Map(memoriesQuery.data.map((memory) => [memory.id, memory] as const));

  const items = albumItemsQuery.data.flatMap((item) => {
    const media = mediaById.get(item.memory_media_id);
    if (!media) {
      return [];
    }

    const memory = memoryById.get(media.memory_id);
    if (!memory) {
      return [];
    }

    return [toAlbumMediaCandidate(media, memory)];
  });

  return {
    description: album.description,
    id: album.id,
    items,
    title: album.title,
    trip: toTripCard(trip, todayDateToken),
  };
};
