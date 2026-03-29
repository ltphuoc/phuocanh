"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays } from "date-fns";
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
import { createCountdownAction } from "@/app/actions/planning-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import { initialActionState } from "@/lib/actions/action-state";
import { formatDateInputValue } from "@/lib/utils/date-input";

const buildCreateCountdownSchema = (
  t: ReturnType<typeof useI18n<"forms.countdown">>["t"],
) =>
  z.object({
    kind: z.enum(["anniversary", "birthday", "travel", "plan", "custom"]),
    note: z.string().max(280, t("validation.noteMax")).optional(),
    targetDate: z.string().min(1, t("validation.targetDateRequired")),
    title: z
      .string()
      .trim()
      .min(1, t("validation.titleRequired"))
      .max(120, t("validation.titleMax")),
  });

type CreateCountdownValues = z.infer<ReturnType<typeof buildCreateCountdownSchema>>;

const COUNTDOWN_KIND_OPTIONS = [
  "anniversary",
  "birthday",
  "travel",
  "plan",
  "custom",
] as const;

export const CreateCountdownForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: countdownsT } = useI18n("countdowns");
  const { t: formT } = useI18n("forms.countdown");
  const [state, submitAction, isPending] = useActionState(
    createCountdownAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<CreateCountdownValues>({
    defaultValues: {
      kind: "anniversary",
      note: "",
      targetDate: formatDateInputValue(addDays(new Date(), 7)),
      title: "",
    },
    resolver: zodResolver(buildCreateCountdownSchema(formT)),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      form.reset({
        kind: "anniversary",
        note: "",
        targetDate: formatDateInputValue(addDays(new Date(), 7)),
        title: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, form, hasSubmitted, state.message, state.status]);

  const kindErrorMessage = form.formState.errors.kind?.message;
  const noteErrorMessage = form.formState.errors.note?.message;
  const targetDateErrorMessage = form.formState.errors.targetDate?.message;
  const titleErrorMessage = form.formState.errors.title?.message;

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("kind", values.kind);
    payload.set("note", values.note ?? "");
    payload.set("targetDate", values.targetDate);
    payload.set("title", values.title);

    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          errorId="countdown-title-error"
          errorMessage={titleErrorMessage}
          htmlFor="countdownTitle"
          label={formT("titleLabel")}
        >
          <Input
            aria-describedby={titleErrorMessage ? "countdown-title-error" : undefined}
            aria-invalid={Boolean(titleErrorMessage)}
            id="countdownTitle"
            placeholder={formT("titlePlaceholder")}
            type="text"
            {...form.register("title")}
          />
        </FormSection>

        <FormSection
          errorId="countdown-kind-error"
          errorMessage={kindErrorMessage}
          htmlFor="countdownKind"
          label={formT("kindLabel")}
        >
          <Select
            aria-describedby={kindErrorMessage ? "countdown-kind-error" : undefined}
            aria-invalid={Boolean(kindErrorMessage)}
            id="countdownKind"
            {...form.register("kind")}
          >
            {COUNTDOWN_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {countdownsT(`kind.${kind}`)}
              </option>
            ))}
          </Select>
        </FormSection>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <FormSection
          description={formT("targetDateDescription")}
          errorId="countdown-target-date-error"
          errorMessage={targetDateErrorMessage}
          htmlFor="countdownTargetDate"
          label={formT("targetDateLabel")}
        >
          <Input
            aria-describedby={targetDateErrorMessage ? "countdown-target-date-error" : undefined}
            aria-invalid={Boolean(targetDateErrorMessage)}
            id="countdownTargetDate"
            type="date"
            {...form.register("targetDate")}
          />
        </FormSection>

        <FormSection
          description={formT("noteDescription")}
          errorId="countdown-note-error"
          errorMessage={noteErrorMessage}
          htmlFor="countdownNote"
          label={formT("noteLabel")}
        >
          <Textarea
            aria-describedby={noteErrorMessage ? "countdown-note-error" : undefined}
            aria-invalid={Boolean(noteErrorMessage)}
            id="countdownNote"
            placeholder={formT("notePlaceholder")}
            rows={4}
            {...form.register("note")}
          />
        </FormSection>
      </div>

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
