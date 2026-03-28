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
import { createChecklistAction } from "@/app/actions/list-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const checklistSchema = z.object({
  title: z.string().min(1).max(120),
});

type ChecklistValues = z.infer<typeof checklistSchema>;

export const CreateChecklistForm = (): ReactElement => {
  const [state, submitAction, isPending] = useActionState(
    createChecklistAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<ChecklistValues>({
    defaultValues: {
      title: "",
    },
    resolver: zodResolver(checklistSchema),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    if (state.status === "success") {
      toast.success(state.message);
      form.reset({
        title: "",
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
    payload.set("title", values.title);
    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection htmlFor="checklistTitle" label="Checklist title">
        <Input id="checklistTitle" placeholder="Weekend goals" type="text" {...form.register("title")} />
      </FormSection>
      <Button className="w-full md:w-auto" isBusy={isPending} type="submit" variant="outline">
        Create checklist
      </Button>
    </form>
  );
};
