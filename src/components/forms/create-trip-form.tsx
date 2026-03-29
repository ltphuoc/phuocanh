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
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createTripAction } from "@/app/actions/planning-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import { initialActionState } from "@/lib/actions/action-state";
import { formatDateInputValue } from "@/lib/utils/date-input";

const buildCreateTripSchema = (t: ReturnType<typeof useI18n<"forms.trip">>["t"]) =>
  z
    .object({
      endDate: z.string().min(1, t("validation.endDateRequired")),
      note: z.string().max(2000, t("validation.noteMax")).optional(),
      startDate: z.string().min(1, t("validation.startDateRequired")),
      title: z
        .string()
        .trim()
        .min(1, t("validation.titleRequired"))
        .max(120, t("validation.titleMax")),
    })
    .refine(({ endDate, startDate }) => endDate >= startDate, {
      message: t("validation.dateRangeInvalid"),
      path: ["endDate"],
    });

type CreateTripValues = z.infer<ReturnType<typeof buildCreateTripSchema>>;

export const CreateTripForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.trip");
  const [state, submitAction, isPending] = useActionState(createTripAction, initialActionState);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<CreateTripValues>({
    defaultValues: {
      endDate: formatDateInputValue(addDays(new Date(), 17)),
      note: "",
      startDate: formatDateInputValue(addDays(new Date(), 14)),
      title: "",
    },
    resolver: zodResolver(buildCreateTripSchema(formT)),
  });
  const startDateValue = useWatch({
    control: form.control,
    name: "startDate",
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      form.reset({
        endDate: formatDateInputValue(addDays(new Date(), 17)),
        note: "",
        startDate: formatDateInputValue(addDays(new Date(), 14)),
        title: "",
      });
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, form, hasSubmitted, state.message, state.status]);

  const endDateErrorMessage = form.formState.errors.endDate?.message;
  const noteErrorMessage = form.formState.errors.note?.message;
  const startDateErrorMessage = form.formState.errors.startDate?.message;
  const titleErrorMessage = form.formState.errors.title?.message;

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("endDate", values.endDate);
    payload.set("note", values.note ?? "");
    payload.set("startDate", values.startDate);
    payload.set("title", values.title);

    startTransition(() => {
      submitAction(payload);
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FormSection
        errorId="trip-title-error"
        errorMessage={titleErrorMessage}
        htmlFor="tripTitle"
        label={formT("titleLabel")}
      >
        <Input
          aria-describedby={titleErrorMessage ? "trip-title-error" : undefined}
          aria-invalid={Boolean(titleErrorMessage)}
          id="tripTitle"
          placeholder={formT("titlePlaceholder")}
          type="text"
          {...form.register("title")}
        />
      </FormSection>

      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          description={formT("startDateDescription")}
          errorId="trip-start-date-error"
          errorMessage={startDateErrorMessage}
          htmlFor="tripStartDate"
          label={formT("startDateLabel")}
        >
          <Input
            aria-describedby={startDateErrorMessage ? "trip-start-date-error" : undefined}
            aria-invalid={Boolean(startDateErrorMessage)}
            id="tripStartDate"
            type="date"
            {...form.register("startDate")}
          />
        </FormSection>

        <FormSection
          description={formT("endDateDescription")}
          errorId="trip-end-date-error"
          errorMessage={endDateErrorMessage}
          htmlFor="tripEndDate"
          label={formT("endDateLabel")}
        >
          <Input
            aria-describedby={endDateErrorMessage ? "trip-end-date-error" : undefined}
            aria-invalid={Boolean(endDateErrorMessage)}
            id="tripEndDate"
            min={startDateValue}
            type="date"
            {...form.register("endDate")}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT("noteDescription")}
        errorId="trip-note-error"
        errorMessage={noteErrorMessage}
        htmlFor="tripNote"
        label={formT("noteLabel")}
      >
        <Textarea
          aria-describedby={noteErrorMessage ? "trip-note-error" : undefined}
          aria-invalid={Boolean(noteErrorMessage)}
          id="tripNote"
          placeholder={formT("notePlaceholder")}
          rows={5}
          {...form.register("note")}
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
