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
import { initialActionState } from "@/lib/actions/action-state";

interface ChecklistToggleFormProps {
  readonly checklistItemId: string;
  readonly isDone: boolean;
}

export const ChecklistToggleForm = ({
  checklistItemId,
  isDone,
}: ChecklistToggleFormProps): ReactElement => {
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
      toast.error(state.message);
    }
  }, [hasSubmitted, state.message, state.status]);

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
      <Button isBusy={isPending} size="sm" type="submit" variant="ghost">
        {isDone ? "Undo" : "Done"}
      </Button>
    </form>
  );
};
