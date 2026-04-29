import { isServer, QueryClient } from '@tanstack/react-query';

export const APP_QUERY_STALE_TIME_MS = 60_000;

export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
      },
      queries: {
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: APP_QUERY_STALE_TIME_MS,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = (): QueryClient => {
  if (isServer) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
