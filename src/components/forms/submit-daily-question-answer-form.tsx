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
import { submitDailyQuestionAnswerAction } from "@/app/actions/gameplay-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import { initialActionState } from "@/lib/actions/action-state";

const buildSubmitDailyQuestionAnswerSchema = (
  t: ReturnType<typeof useI18n<"forms.dailyQuestion">>["t"],
) =>
  z.object({
    answerBody: z
      .string()
      .trim()
      .min(1, t("validation.answerRequired"))
      .max(800, t("validation.answerMax")),
    roundId: z.uuid(),
  });

type SubmitDailyQuestionAnswerValues = z.infer<
  ReturnType<typeof buildSubmitDailyQuestionAnswerSchema>
>;

interface SubmitDailyQuestionAnswerFormProps {
  readonly roundId: string;
}

export const SubmitDailyQuestionAnswerForm = ({
  roundId,
}: SubmitDailyQuestionAnswerFormProps): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.dailyQuestion");
  const [state, submitAction, isPending] = useActionState(
    submitDailyQuestionAnswerAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<SubmitDailyQuestionAnswerValues>({
    defaultValues: {
      answerBody: "",
      roundId,
    },
    resolver: zodResolver(buildSubmitDailyQuestionAnswerSchema(formT)),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";
    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      form.reset({
        answerBody: "",
        roundId,
      });
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, form, hasSubmitted, roundId, state.message, state.status]);

  const answerErrorMessage = form.formState.errors.answerBody?.message;

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("answerBody", values.answerBody);
    payload.set("roundId", values.roundId);

    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <input type="hidden" {...form.register("roundId")} />
      <FormSection
        description={formT("answerDescription")}
        errorId="daily-question-answer-error"
        errorMessage={answerErrorMessage}
        htmlFor="dailyQuestionAnswer"
        label={formT("answerLabel")}
      >
        <Textarea
          aria-describedby={answerErrorMessage ? "daily-question-answer-error" : undefined}
          aria-invalid={Boolean(answerErrorMessage)}
          id="dailyQuestionAnswer"
          placeholder={formT("answerPlaceholder")}
          rows={6}
          {...form.register("answerBody")}
        />
      </FormSection>

      <Button
        busyLabel={commonT("working")}
        className="w-full md:w-auto"
        isBusy={isPending}
        type="submit"
      >
        {formT("submit")}
      </Button>
    </form>
  );
};
