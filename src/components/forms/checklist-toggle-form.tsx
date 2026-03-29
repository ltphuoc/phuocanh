"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { toggleChecklistItemAction } from "@/app/actions/list-actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { initialActionState } from "@/lib/actions/action-state";

interface ChecklistToggleFormProps {
  readonly checklistItemId: string;
  readonly isDone: boolean;
}

export const ChecklistToggleForm = ({
  checklistItemId,
  isDone,
}: ChecklistToggleFormProps): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.checklistToggle");
  const [state, submitAction, isPending] = useActionState(
    toggleChecklistItemAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(state.message || "unexpectedError"));
    }
  }, [actionsT, hasSubmitted, state.message, state.status]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setHasSubmitted(true);
        const payload = new FormData();
        payload.set("checklistItemId", checklistItemId);
        payload.set("nextDone", isDone ? "false" : "true");
        startTransition(() => {
          submitAction(payload);
        });
      }}
    >
      <Button
        busyLabel={commonT("working")}
        isBusy={isPending}
        size="sm"
        type="submit"
        variant="ghost"
      >
        {isDone ? formT("undo") : formT("done")}
      </Button>
    </form>
  );
};
