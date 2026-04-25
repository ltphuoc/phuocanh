import "server-only";

import {
  dehydrate,
  type DehydratedState,
  type QueryKey,
} from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";

export const dehydrateAppQuery = <TData>(
  queryKey: QueryKey,
  data: TData,
): DehydratedState => {
  const queryClient = getQueryClient();
  queryClient.setQueryData(queryKey, data);
  return dehydrate(queryClient);
};
