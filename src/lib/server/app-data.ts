import 'server-only';

import type {
  AlbumDetailAppData,
  AlbumsAppData,
  AppDataContext,
  CountdownsAppData,
  DailyQuestionAppData,
  FutureNotesAppData,
  GamesAppData,
  GuessDateAppData,
  HomeAppData,
  ListsAppData,
  MapAppData,
  MemoryDetailAppData,
  OnThisDayAppData,
  SettingsAppData,
  StatsAppData,
  TripDetailAppData,
  TripsAppData,
  TriviaAppData,
} from '@/lib/app-data/types';
import type { CoupleContext } from '@/lib/server/couple-context';

import { signMemoryMediaStorageItems } from '@/lib/server/memory-media';
import {
  getHomePageData,
  getListsPageData,
  getMemoryDetailData,
  getOnThisDayData,
} from '@/lib/server/phase-one-data';
import {
  getDailyQuestionPageData,
  getGameplayStatsPageData,
  getGamesHubData,
  getGuessDatePageData,
  getTriviaPageData,
} from '@/lib/server/phase-three-data';
import {
  getAlbumDetailData,
  getAlbumsPageData,
  getCountdownsPageData,
  getFutureNotesPageData,
  getMapPageData,
  getTripDetailData,
  getTripsPageData,
} from '@/lib/server/phase-two-data';

const toAppDataContext = (context: CoupleContext): AppDataContext => ({
  coupleId: context.coupleId,
  coupleStartedAt: context.coupleStartedAt,
  timeZone: context.timezone,
});

export const getHomeAppData = async (context: CoupleContext): Promise<HomeAppData> => {
  const data = await getHomePageData(context);
  const signedMemoryPreviews = await signMemoryMediaStorageItems(
    data.memories.map((memory) => ({
      id: memory.id,
      mediaType: memory.mediaType,
      storagePath: memory.storagePath,
    })),
  );
  const imageUrlByMemoryId = new Map(
    signedMemoryPreviews.map(
      (memory) => [memory.id, memory.mediaType === 'image' ? memory.signedUrl : null] as const,
    ),
  );

  return {
    checklists: data.checklists,
    context: toAppDataContext(context),
    memories: data.memories.map((memory) => ({
      ...memory,
      imageUrl: imageUrlByMemoryId.get(memory.id) ?? null,
    })),
    relationshipDays: data.relationshipDays,
    wishItems: data.wishItems,
  };
};

export const getListsAppData = async (context: CoupleContext): Promise<ListsAppData> => ({
  ...(await getListsPageData(context)),
  context: toAppDataContext(context),
});

export const getOnThisDayAppData = async (context: CoupleContext): Promise<OnThisDayAppData> => {
  const memories = await getOnThisDayData(context);
  const signedMemoryPreviews = await signMemoryMediaStorageItems(
    memories.map((memory) => ({
      id: memory.id,
      mediaType: memory.mediaType,
      storagePath: memory.storagePath,
    })),
  );
  const imageUrlByMemoryId = new Map(
    signedMemoryPreviews.map(
      (memory) => [memory.id, memory.mediaType === 'image' ? memory.signedUrl : null] as const,
    ),
  );

  return {
    context: toAppDataContext(context),
    memories: memories.map((memory) => ({
      ...memory,
      imageUrl: imageUrlByMemoryId.get(memory.id) ?? null,
    })),
  };
};

export const getMemoryDetailAppData = async (
  context: CoupleContext,
  memoryId: string,
): Promise<MemoryDetailAppData | null> => {
  const memory = await getMemoryDetailData(context, memoryId);
  if (!memory) {
    return null;
  }

  // Destructure media out so the private storage object keys never serialize to the
  // client through `memory.media`; the server still uses them to sign URLs below.
  const { media: memoryMedia, ...memoryWithoutMedia } = memory;
  const signedMedia = await signMemoryMediaStorageItems(memoryMedia);

  return {
    context: toAppDataContext(context),
    // Ship only client-rendered fields; the private storage object key (storagePath)
    // must not leave the server.
    media: signedMedia.map((item) => ({
      id: item.id,
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      originalFileName: item.originalFileName,
      signedUrl: item.signedUrl,
    })),
    memory: memoryWithoutMedia,
  };
};

export const getCountdownsAppData = async (context: CoupleContext): Promise<CountdownsAppData> => ({
  ...(await getCountdownsPageData(context)),
  context: toAppDataContext(context),
});

export const getFutureNotesAppData = async (
  context: CoupleContext,
): Promise<FutureNotesAppData> => ({
  ...(await getFutureNotesPageData(context)),
  context: toAppDataContext(context),
});

export const getTripsAppData = async (context: CoupleContext): Promise<TripsAppData> => ({
  ...(await getTripsPageData(context)),
  context: toAppDataContext(context),
});

export const getTripDetailAppData = async (
  context: CoupleContext,
  tripId: string,
): Promise<TripDetailAppData | null> => {
  const trip = await getTripDetailData(context, tripId);
  if (!trip) {
    return null;
  }

  return {
    context: toAppDataContext(context),
    trip,
  };
};

export const getMapAppData = async (context: CoupleContext): Promise<MapAppData> => ({
  ...(await getMapPageData(context)),
  context: toAppDataContext(context),
});

export const getAlbumsAppData = async (context: CoupleContext): Promise<AlbumsAppData> => ({
  ...(await getAlbumsPageData(context)),
  context: toAppDataContext(context),
});

export const getAlbumDetailAppData = async (
  context: CoupleContext,
  albumId: string,
): Promise<AlbumDetailAppData | null> => {
  const album = await getAlbumDetailData(context, albumId);
  if (!album) {
    return null;
  }

  return {
    album,
    context: toAppDataContext(context),
  };
};

export const getSettingsAppData = (context: CoupleContext): SettingsAppData => ({
  context: toAppDataContext(context),
  currentTimeZone: context.timezone,
});

export const getGamesAppData = async (context: CoupleContext): Promise<GamesAppData> => ({
  ...(await getGamesHubData(context)),
  context: toAppDataContext(context),
});

export const getDailyQuestionAppData = async (
  context: CoupleContext,
): Promise<DailyQuestionAppData> => ({
  ...(await getDailyQuestionPageData(context)),
  context: toAppDataContext(context),
});

export const getGuessDateAppData = async (context: CoupleContext): Promise<GuessDateAppData> => ({
  ...(await getGuessDatePageData(context)),
  context: toAppDataContext(context),
});

export const getTriviaAppData = async (context: CoupleContext): Promise<TriviaAppData> => ({
  ...(await getTriviaPageData(context)),
  context: toAppDataContext(context),
});

export const getStatsAppData = async (context: CoupleContext): Promise<StatsAppData> => ({
  ...(await getGameplayStatsPageData(context)),
  context: toAppDataContext(context),
});
