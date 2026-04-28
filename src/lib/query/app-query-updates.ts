import type { QueryClient } from "@tanstack/react-query";
import type {
  HomeAppData,
  ListsAppData,
  SettingsAppData,
} from "@/lib/app-data/types";
import { appQueryKeys } from "@/lib/query/app-query-keys";

const invalidate = (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): Promise<void> =>
  queryClient.invalidateQueries({
    queryKey,
  });

export const invalidateHomeAndLists = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.home()),
    invalidate(queryClient, appQueryKeys.lists()),
  ]);
};

export const invalidateMemoryCreated = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.home()),
    invalidate(queryClient, appQueryKeys.onThisDay()),
    invalidate(queryClient, appQueryKeys.lists()),
    invalidate(queryClient, appQueryKeys.tripDetails()),
  ]);
};

export const invalidateGameplay = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.games()),
    invalidate(queryClient, appQueryKeys.dailyQuestion()),
    invalidate(queryClient, appQueryKeys.stats()),
  ]);
};

export const invalidateGuessDate = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.games()),
    invalidate(queryClient, appQueryKeys.guessDate()),
  ]);
};

export const invalidateTrivia = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.games()),
    invalidate(queryClient, appQueryKeys.trivia()),
  ]);
};

export const invalidateTimezoneDerivedData = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    invalidate(queryClient, appQueryKeys.home()),
    invalidate(queryClient, appQueryKeys.onThisDay()),
    invalidate(queryClient, appQueryKeys.memories()),
    invalidate(queryClient, appQueryKeys.countdowns()),
    invalidate(queryClient, appQueryKeys.futureNotes()),
    invalidate(queryClient, appQueryKeys.trips()),
    invalidate(queryClient, appQueryKeys.tripDetails()),
    invalidate(queryClient, appQueryKeys.map()),
    invalidate(queryClient, appQueryKeys.albums()),
    invalidate(queryClient, appQueryKeys.albumDetails()),
    invalidate(queryClient, appQueryKeys.games()),
    invalidate(queryClient, appQueryKeys.dailyQuestion()),
    invalidate(queryClient, appQueryKeys.guessDate()),
    invalidate(queryClient, appQueryKeys.trivia()),
    invalidate(queryClient, appQueryKeys.stats()),
  ]);
};

export const setSettingsTimeZone = (
  queryClient: QueryClient,
  timeZone: string,
): void => {
  queryClient.setQueryData<SettingsAppData>(appQueryKeys.settings(), (current) =>
    current
      ? {
          ...current,
          currentTimeZone: timeZone,
          context: {
            ...current.context,
            timeZone,
          },
        }
      : current,
  );
};

const updateChecklistDone = <TData extends HomeAppData | ListsAppData>(
  current: TData | undefined,
  checklistItemId: string,
  isDone: boolean,
): TData | undefined => {
  if (!current) {
    return current;
  }

  return {
    ...current,
    checklists: current.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) =>
        item.id === checklistItemId
          ? {
              ...item,
              doneAt: isDone ? new Date().toISOString() : null,
              isDone,
            }
          : item,
      ),
    })),
  };
};

export const setChecklistDone = (
  queryClient: QueryClient,
  checklistItemId: string,
  isDone: boolean,
): void => {
  queryClient.setQueryData<HomeAppData>(appQueryKeys.home(), (current) =>
    updateChecklistDone(current, checklistItemId, isDone),
  );
  queryClient.setQueryData<ListsAppData>(appQueryKeys.lists(), (current) =>
    updateChecklistDone(current, checklistItemId, isDone),
  );
};
