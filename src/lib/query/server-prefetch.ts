import 'server-only';

import type { DehydratedState, QueryKey } from '@tanstack/react-query';

import { dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query/query-client';

export const dehydrateAppQuery = <TData>(queryKey: QueryKey, data: TData): DehydratedState => {
  const queryClient = getQueryClient();
  queryClient.setQueryData(queryKey, data);
  return dehydrate(queryClient);
};
