"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { toggleChecklistItemAction } from "@/app/actions/list-actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import type { HomeAppData, ListsAppData } from "@/lib/app-data/types";
import {
  getActionErrorMessage,
  runActionMutation,
} from "@/lib/query/action-mutation";
import { appQueryKeys } from "@/lib/query/app-query-keys";
import {
  invalidateHomeAndLists,
  setChecklistDone,
} from "@/lib/query/app-query-updates";

interface ChecklistToggleFormProps {
  readonly checklistItemId: string;
  readonly isDone: boolean;
}

interface ChecklistToggleVariables {
  readonly nextDone: boolean;
  readonly payload: FormData;
}

export const ChecklistToggleForm = ({
  checklistItemId,
  isDone,
}: ChecklistToggleFormProps): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.checklistToggle");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ payload }: ChecklistToggleVariables) =>
      runActionMutation(toggleChecklistItemAction, payload),
    onError: (error, _variables, context) => {
      const previous = context as
        | {
            readonly home: HomeAppData | undefined;
            readonly lists: ListsAppData | undefined;
          }
        | undefined;

      if (previous?.home) {
        queryClient.setQueryData(appQueryKeys.home(), previous.home);
      }

      if (previous?.lists) {
        queryClient.setQueryData(appQueryKeys.lists(), previous.lists);
      }

      toast.error(actionsT(getActionErrorMessage(error)));
    },
    onMutate: async ({ nextDone }: ChecklistToggleVariables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: appQueryKeys.home() }),
        queryClient.cancelQueries({ queryKey: appQueryKeys.lists() }),
      ]);

      const home = queryClient.getQueryData<HomeAppData>(appQueryKeys.home());
      const lists = queryClient.getQueryData<ListsAppData>(appQueryKeys.lists());
      setChecklistDone(queryClient, checklistItemId, nextDone);

      return {
        home,
        lists,
      };
    },
    onSettled: () => {
      void invalidateHomeAndLists(queryClient);
    },
  });

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const nextDone = !isDone;
        const payload = new FormData();
        payload.set("checklistItemId", checklistItemId);
        payload.set("nextDone", nextDone ? "true" : "false");
        mutation.mutate({ nextDone, payload });
      }}
    >
      <Button
        busyLabel={commonT("working")}
        isBusy={mutation.isPending}
        size="sm"
        type="submit"
        variant="ghost"
      >
        {isDone ? formT("undo") : formT("done")}
      </Button>
    </form>
  );
};
