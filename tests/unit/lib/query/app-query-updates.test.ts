import type { HomeAppData, SettingsAppData } from '@/lib/app-data/types';

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { appQueryKeys } from '@/lib/query/app-query-keys';
import {
  invalidateGameplay,
  invalidateGuessDate,
  invalidateMemoryCreated,
  invalidateTimezoneDerivedData,
  invalidateTrivia,
  setChecklistDone,
  setSettingsTimeZone,
} from '@/lib/query/app-query-updates';

const appDataContext = {
  coupleId: 'couple-id',
  coupleStartedAt: '2024-01-01',
  timeZone: 'Asia/Ho_Chi_Minh',
};

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const getInvalidatedKeys = (queryClient: QueryClient): readonly unknown[][] =>
  vi
    .mocked(queryClient.invalidateQueries)
    .mock.calls.map(([filters]) => filters?.queryKey as unknown[]);

describe('app query updates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  test('invalidates exact gameplay keys by mode', async () => {
    await invalidateGameplay(queryClient);
    expect(getInvalidatedKeys(queryClient)).toEqual([
      appQueryKeys.games(),
      appQueryKeys.dailyQuestion(),
      appQueryKeys.stats(),
    ]);

    vi.mocked(queryClient.invalidateQueries).mockClear();
    await invalidateGuessDate(queryClient);
    expect(getInvalidatedKeys(queryClient)).toEqual([
      appQueryKeys.games(),
      appQueryKeys.guessDate(),
    ]);

    vi.mocked(queryClient.invalidateQueries).mockClear();
    await invalidateTrivia(queryClient);
    expect(getInvalidatedKeys(queryClient)).toEqual([appQueryKeys.games(), appQueryKeys.trivia()]);
  });

  test('invalidates memory-created dependencies', async () => {
    await invalidateMemoryCreated(queryClient);

    expect(getInvalidatedKeys(queryClient)).toEqual([
      appQueryKeys.home(),
      appQueryKeys.onThisDay(),
      appQueryKeys.lists(),
      appQueryKeys.tripDetails(),
    ]);
  });

  test('invalidates all timezone-derived app data', async () => {
    await invalidateTimezoneDerivedData(queryClient);

    expect(getInvalidatedKeys(queryClient)).toEqual([
      appQueryKeys.home(),
      appQueryKeys.onThisDay(),
      appQueryKeys.memories(),
      appQueryKeys.countdowns(),
      appQueryKeys.futureNotes(),
      appQueryKeys.trips(),
      appQueryKeys.tripDetails(),
      appQueryKeys.map(),
      appQueryKeys.albums(),
      appQueryKeys.albumDetails(),
      appQueryKeys.games(),
      appQueryKeys.dailyQuestion(),
      appQueryKeys.guessDate(),
      appQueryKeys.trivia(),
      appQueryKeys.stats(),
    ]);
  });

  test('updates the settings timezone cache in place', () => {
    const settingsData = {
      context: appDataContext,
      currentTimeZone: 'Asia/Ho_Chi_Minh',
    } satisfies SettingsAppData;

    queryClient.setQueryData(appQueryKeys.settings(), settingsData);
    setSettingsTimeZone(queryClient, 'America/New_York');

    expect(queryClient.getQueryData(appQueryKeys.settings())).toEqual({
      context: {
        ...appDataContext,
        timeZone: 'America/New_York',
      },
      currentTimeZone: 'America/New_York',
    });
  });

  test('optimistically toggles checklist items in home and lists caches', () => {
    const homeData = {
      checklists: [
        {
          id: 'checklist-id',
          items: [
            {
              checklistId: 'checklist-id',
              doneAt: null,
              id: 'item-id',
              isDone: false,
              text: 'Pack bags',
            },
          ],
          title: 'Travel',
        },
      ],
      context: appDataContext,
      memories: [],
      relationshipDays: 1,
      wishItems: [],
    } satisfies HomeAppData;

    queryClient.setQueryData(appQueryKeys.home(), homeData);
    queryClient.setQueryData(appQueryKeys.lists(), {
      checklists: homeData.checklists,
      context: appDataContext,
      wishItems: [],
    });

    setChecklistDone(queryClient, 'item-id', true);

    const updatedHome = queryClient.getQueryData<HomeAppData>(appQueryKeys.home());
    expect(updatedHome?.checklists[0]?.items[0]).toMatchObject({
      doneAt: expect.any(String),
      isDone: true,
    });

    setChecklistDone(queryClient, 'item-id', false);
    const updatedLists = queryClient.getQueryData<typeof homeData>(appQueryKeys.lists());
    expect(updatedLists?.checklists[0]?.items[0]).toMatchObject({
      doneAt: null,
      isDone: false,
    });
  });
});
