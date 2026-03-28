"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { addChecklistItemAction } from "@/app/actions/list-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const checklistItemSchema = z.object({
  text: z.string().min(1).max(180),
});

type ChecklistItemValues = z.infer<typeof checklistItemSchema>;

interface ChecklistItemFormProps {
  readonly checklistId: string;
}

export const ChecklistItemForm = ({
  checklistId,
}: ChecklistItemFormProps): ReactElement => {
  const [state, submitAction, isPending] = useActionState(
    addChecklistItemAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<ChecklistItemValues>({
    defaultValues: {
      text: "",
    },
    resolver: zodResolver(checklistItemSchema),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    if (state.status === "success") {
      toast.success(state.message);
      form.reset({
        text: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [form, hasSubmitted, state.message, state.status]);

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("checklistId", checklistId);
    payload.set("text", values.text);
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
      <Input placeholder="Add item" type="text" {...form.register("text")} />
      <Button className="sm:w-auto" isBusy={isPending} size="sm" type="submit" variant="outline">
        Add
      </Button>
    </form>
  );
};
