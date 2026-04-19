"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { z } from "zod";
import { updateCoupleTimezoneAction } from "@/app/actions/planning-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";
import { initialActionState } from "@/lib/actions/action-state";
import {
  getSupportedCoupleTimeZones,
  isSupportedCoupleTimeZone,
} from "@/lib/utils/couple-timezone";

const COUPLE_TIME_ZONE_OPTIONS = getSupportedCoupleTimeZones();
const TIME_ZONE_DATALIST_ID = "couple-timezone-options";

interface UpdateCoupleTimezoneFormProps {
  readonly currentTimeZone: string;
}

const buildUpdateCoupleTimezoneSchema = (
  t: ReturnType<typeof useI18n<"forms.settingsTimezone">>["t"],
) =>
  z.object({
    timeZone: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .refine((value) => isSupportedCoupleTimeZone(value), {
        message: t("validation.invalid"),
      }),
  });

export const UpdateCoupleTimezoneForm = ({
  currentTimeZone,
}: UpdateCoupleTimezoneFormProps): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.settingsTimezone");
  const [state, submitAction, isPending] = useActionState(
    updateCoupleTimezoneAction,
    initialActionState,
  );
  const formKey = useId();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeZoneErrorMessage, setTimeZoneErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";

    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
    }
  }, [actionsT, hasSubmitted, state.message, state.status]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = new FormData(event.currentTarget);
    const parsed = buildUpdateCoupleTimezoneSchema(formT).safeParse({
      timeZone: payload.get("timeZone"),
    });

    if (!parsed.success) {
      setTimeZoneErrorMessage(parsed.error.flatten().fieldErrors.timeZone?.[0]);
      return;
    }

    setTimeZoneErrorMessage(undefined);
    setHasSubmitted(true);
    startTransition(() => {
      submitAction(payload);
    });
  };

  return (
    <form className="flex flex-col gap-4" key={`${formKey}-${currentTimeZone}`} onSubmit={onSubmit}>
      <FormSection
        description={formT("description")}
        errorId="couple-timezone-error"
        errorMessage={timeZoneErrorMessage}
        htmlFor="coupleTimeZone"
        label={formT("label")}
      >
        <>
          <Input
            aria-describedby={timeZoneErrorMessage ? "couple-timezone-error" : undefined}
            aria-invalid={Boolean(timeZoneErrorMessage)}
            autoComplete="off"
            id="coupleTimeZone"
            list={TIME_ZONE_DATALIST_ID}
            name="timeZone"
            defaultValue={currentTimeZone}
            onChange={() => {
              if (timeZoneErrorMessage) {
                setTimeZoneErrorMessage(undefined);
              }
            }}
            placeholder={formT("placeholder")}
            spellCheck={false}
            type="text"
          />
          <datalist id={TIME_ZONE_DATALIST_ID}>
            {COUPLE_TIME_ZONE_OPTIONS.map((timeZone) => (
              <option key={timeZone} value={timeZone} />
            ))}
          </datalist>
        </>
      </FormSection>

      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
        {formT("currentValue", {
          timeZone: currentTimeZone,
        })}
      </p>

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
