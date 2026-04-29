const appDataRoot = ['app-data'] as const;

export const appQueryKeys = {
  album: (albumId: string) => [...appDataRoot, 'album', albumId] as const,
  albumDetails: () => [...appDataRoot, 'album'] as const,
  albums: () => [...appDataRoot, 'albums'] as const,
  countdowns: () => [...appDataRoot, 'countdowns'] as const,
  dailyQuestion: () => [...appDataRoot, 'daily-question'] as const,
  futureNotes: () => [...appDataRoot, 'future-notes'] as const,
  games: () => [...appDataRoot, 'games'] as const,
  guessDate: () => [...appDataRoot, 'guess-date'] as const,
  home: () => [...appDataRoot, 'home'] as const,
  lists: () => [...appDataRoot, 'lists'] as const,
  map: () => [...appDataRoot, 'map'] as const,
  memories: () => [...appDataRoot, 'memory'] as const,
  memory: (memoryId: string) => [...appDataRoot, 'memory', memoryId] as const,
  onThisDay: () => [...appDataRoot, 'on-this-day'] as const,
  settings: () => [...appDataRoot, 'settings'] as const,
  stats: () => [...appDataRoot, 'stats'] as const,
  trivia: () => [...appDataRoot, 'trivia'] as const,
  trip: (tripId: string) => [...appDataRoot, 'trip', tripId] as const,
  tripDetails: () => [...appDataRoot, 'trip'] as const,
  trips: () => [...appDataRoot, 'trips'] as const,
} as const;
