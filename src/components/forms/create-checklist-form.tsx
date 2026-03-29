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
import { useI18n } from "@/hooks/useI18n";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/actions/action-state";

const checklistSchema = z.object({
  title: z.string().min(1).max(120),
});

type ChecklistValues = z.infer<typeof checklistSchema>;

export const CreateChecklistForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.checklist");
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

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      form.reset({
        title: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, form, hasSubmitted, state.message, state.status]);

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
      <FormSection htmlFor="checklistTitle" label={formT("titleLabel")}>
        <Input
          id="checklistTitle"
          placeholder={formT("titlePlaceholder")}
          type="text"
          {...form.register("title")}
        />
      </FormSection>
      <Button
        busyLabel={commonT("working")}
        className="w-full md:w-auto"
        isBusy={isPending}
        type="submit"
        variant="outline"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
