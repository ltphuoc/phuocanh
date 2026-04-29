import type {
  AlbumDetailAppData,
  AlbumsAppData,
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

const fetchAppData = async <TData>(pathname: string): Promise<TData> => {
  const response = await fetch(pathname, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load app data from ${pathname}.`);
  }

  return response.json() as Promise<TData>;
};

export const appQueryFetchers = {
  album: (albumId: string): Promise<AlbumDetailAppData> =>
    fetchAppData(`/api/app-data/albums/${encodeURIComponent(albumId)}`),
  albums: (): Promise<AlbumsAppData> => fetchAppData('/api/app-data/albums'),
  countdowns: (): Promise<CountdownsAppData> => fetchAppData('/api/app-data/countdowns'),
  dailyQuestion: (): Promise<DailyQuestionAppData> =>
    fetchAppData('/api/app-data/games/daily-question'),
  futureNotes: (): Promise<FutureNotesAppData> => fetchAppData('/api/app-data/future-notes'),
  games: (): Promise<GamesAppData> => fetchAppData('/api/app-data/games'),
  guessDate: (): Promise<GuessDateAppData> => fetchAppData('/api/app-data/games/guess-date'),
  home: (): Promise<HomeAppData> => fetchAppData('/api/app-data/home'),
  lists: (): Promise<ListsAppData> => fetchAppData('/api/app-data/lists'),
  map: (): Promise<MapAppData> => fetchAppData('/api/app-data/map'),
  memory: (memoryId: string): Promise<MemoryDetailAppData> =>
    fetchAppData(`/api/app-data/memories/${encodeURIComponent(memoryId)}`),
  onThisDay: (): Promise<OnThisDayAppData> => fetchAppData('/api/app-data/on-this-day'),
  settings: (): Promise<SettingsAppData> => fetchAppData('/api/app-data/settings'),
  stats: (): Promise<StatsAppData> => fetchAppData('/api/app-data/stats'),
  trivia: (): Promise<TriviaAppData> => fetchAppData('/api/app-data/games/trivia'),
  trip: (tripId: string): Promise<TripDetailAppData> =>
    fetchAppData(`/api/app-data/trips/${encodeURIComponent(tripId)}`),
  trips: (): Promise<TripsAppData> => fetchAppData('/api/app-data/trips'),
} as const;
