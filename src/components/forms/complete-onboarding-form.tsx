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
import { completeOnboardingAction } from "@/app/actions/auth-actions";
import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "@/i18n/navigation";
import { initialActionState } from "@/lib/actions/action-state";
import {
  getCurrentDateTokenInTimeZone,
  getSupportedCoupleTimeZones,
  isSupportedCoupleTimeZone,
} from "@/lib/utils/couple-timezone";

const ONBOARDING_TIME_ZONE_OPTIONS = getSupportedCoupleTimeZones();
const TIME_ZONE_DATALIST_ID = "onboarding-timezone-options";

type OnboardingStep = 1 | 2 | 3 | 4;

const isIsoDate = (value: string): boolean => z.iso.date().safeParse(value).success;

const buildCompleteOnboardingSchema = (
  t: ReturnType<typeof useI18n<"forms.onboarding">>["t"],
) =>
  z
    .object({
      confirmation: z.boolean().refine((value) => value, {
        message: t("validation.confirmationRequired"),
      }),
      coupleName: z
        .string()
        .trim()
        .min(1, t("validation.coupleNameRequired"))
        .max(120, t("validation.coupleNameMax")),
      startedDate: z
        .string()
        .trim()
        .min(1, t("validation.startedDateRequired"))
        .refine((value) => isIsoDate(value), {
          message: t("validation.startedDateInvalid"),
        }),
      timeZone: z
        .string()
        .trim()
        .min(1, t("validation.timeZoneRequired"))
        .refine((value) => isSupportedCoupleTimeZone(value), {
          message: t("validation.timeZoneInvalid"),
        }),
    })
    .superRefine(({ startedDate, timeZone }, context) => {
      if (!isSupportedCoupleTimeZone(timeZone) || !isIsoDate(startedDate)) {
        return;
      }

      const todayInSelectedTimezone = getCurrentDateTokenInTimeZone(timeZone);
      if (startedDate > todayInSelectedTimezone) {
        context.addIssue({
          code: "custom",
          path: ["startedDate"],
          message: t("validation.startedDateFuture"),
        });
      }
    });

type CompleteOnboardingValues = z.infer<ReturnType<typeof buildCompleteOnboardingSchema>>;

const STEP_FIELDS: Readonly<Record<OnboardingStep, readonly (keyof CompleteOnboardingValues)[]>> = {
  1: ["coupleName"],
  2: ["timeZone"],
  3: ["startedDate"],
  4: ["confirmation"],
};

const getNextStep = (currentStep: OnboardingStep): OnboardingStep => {
  switch (currentStep) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    case 4:
    default:
      return 4;
  }
};

const getPreviousStep = (currentStep: OnboardingStep): OnboardingStep => {
  switch (currentStep) {
    case 4:
      return 3;
    case 3:
      return 2;
    case 2:
      return 1;
    case 1:
    default:
      return 1;
  }
};

export const CompleteOnboardingForm = (): ReactElement => {
  const { t: actionsT } = useI18n("actions");
  const { t: commonT } = useI18n("common");
  const { t: formT } = useI18n("forms.onboarding");
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [state, submitAction, isPending] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const form = useForm<CompleteOnboardingValues>({
    defaultValues: {
      confirmation: false,
      coupleName: "",
      startedDate: "",
      timeZone: "",
    },
    resolver: zodResolver(buildCompleteOnboardingSchema(formT)),
  });

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }

    const actionMessageKey = state.message || "unexpectedError";
    if (state.status === "success") {
      toast.success(actionsT(actionMessageKey));
      router.replace("/home");
      return;
    }

    if (state.status === "error") {
      toast.error(actionsT(actionMessageKey));
      if (state.message === "auth.onboarding.coupleExists") {
        router.replace("/accept-invite");
      }
    }
  }, [actionsT, hasSubmitted, router, state.message, state.status]);

  const nextStep = async (): Promise<void> => {
    const fields = STEP_FIELDS[step];
    const isValidStep = await form.trigger(fields, {
      shouldFocus: true,
    });

    if (!isValidStep || step === 4) {
      return;
    }

    setStep((currentStep) => getNextStep(currentStep));
  };

  const previousStep = (): void => {
    if (step === 1) {
      return;
    }

    setStep((currentStep) => getPreviousStep(currentStep));
  };

  const onSubmit = form.handleSubmit((values) => {
    setHasSubmitted(true);
    const payload = new FormData();
    payload.set("confirmation", String(values.confirmation));
    payload.set("coupleName", values.coupleName);
    payload.set("startedDate", values.startedDate);
    payload.set("timeZone", values.timeZone);

    startTransition(() => {
      submitAction(payload);
    });
  });

  const values = form.getValues();
  const coupleNameError = form.formState.errors.coupleName?.message;
  const startedDateError = form.formState.errors.startedDate?.message;
  const timeZoneError = form.formState.errors.timeZone?.message;
  const confirmationError = form.formState.errors.confirmation?.message;

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {formT("stepIndicator", {
          step,
          total: 4,
        })}
      </p>

      {step === 1 ? (
        <FormSection
          description={formT("coupleNameDescription")}
          errorId="onboarding-couple-name-error"
          errorMessage={coupleNameError}
          htmlFor="onboardingCoupleName"
          label={formT("coupleNameLabel")}
        >
          <Input
            aria-describedby={coupleNameError ? "onboarding-couple-name-error" : undefined}
            aria-invalid={Boolean(coupleNameError)}
            id="onboardingCoupleName"
            placeholder={formT("coupleNamePlaceholder")}
            type="text"
            {...form.register("coupleName")}
          />
        </FormSection>
      ) : null}

      {step === 2 ? (
        <FormSection
          description={formT("timeZoneDescription")}
          errorId="onboarding-timezone-error"
          errorMessage={timeZoneError}
          htmlFor="onboardingTimeZone"
          label={formT("timeZoneLabel")}
        >
          <>
            <Input
              aria-describedby={timeZoneError ? "onboarding-timezone-error" : undefined}
              aria-invalid={Boolean(timeZoneError)}
              autoComplete="off"
              id="onboardingTimeZone"
              list={TIME_ZONE_DATALIST_ID}
              placeholder={formT("timeZonePlaceholder")}
              spellCheck={false}
              type="text"
              {...form.register("timeZone")}
            />
            <datalist id={TIME_ZONE_DATALIST_ID}>
              {ONBOARDING_TIME_ZONE_OPTIONS.map((timeZone) => (
                <option key={timeZone} value={timeZone} />
              ))}
            </datalist>
          </>
        </FormSection>
      ) : null}

      {step === 3 ? (
        <FormSection
          description={formT("startedDateDescription")}
          errorId="onboarding-started-date-error"
          errorMessage={startedDateError}
          htmlFor="onboardingStartedDate"
          label={formT("startedDateLabel")}
        >
          <Input
            aria-describedby={startedDateError ? "onboarding-started-date-error" : undefined}
            aria-invalid={Boolean(startedDateError)}
            id="onboardingStartedDate"
            type="date"
            {...form.register("startedDate")}
          />
        </FormSection>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card px-4 py-4">
            <p className="ui-meta">{formT("summaryLabel")}</p>
            <dl className="mt-3 space-y-2 text-sm text-foreground">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{formT("summary.coupleName")}</dt>
                <dd className="text-right font-medium">{values.coupleName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{formT("summary.timeZone")}</dt>
                <dd className="text-right font-medium">{values.timeZone}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{formT("summary.startedDate")}</dt>
                <dd className="text-right font-medium">{values.startedDate}</dd>
              </div>
            </dl>
          </div>
          <FormSection
            errorId="onboarding-confirmation-error"
            errorMessage={confirmationError}
            htmlFor="onboardingConfirmation"
            label={formT("confirmationLabel")}
          >
            <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground">
              <input
                aria-describedby={confirmationError ? "onboarding-confirmation-error" : undefined}
                aria-invalid={Boolean(confirmationError)}
                className="mt-1 size-4 rounded border-border accent-primary"
                id="onboardingConfirmation"
                type="checkbox"
                {...form.register("confirmation")}
              />
              <span>{formT("confirmationDescription")}</span>
            </label>
          </FormSection>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step > 1 ? (
          <Button
            className="w-full md:w-auto"
            disabled={isPending}
            onClick={previousStep}
            type="button"
            variant="outline"
          >
            {formT("back")}
          </Button>
        ) : null}

        {step < 4 ? (
          <Button
            className="w-full md:w-auto"
            disabled={isPending}
            onClick={() => {
              void nextStep();
            }}
            type="button"
          >
            {formT("next")}
          </Button>
        ) : (
          <Button
            busyLabel={commonT("working")}
            className="w-full md:w-auto"
            isBusy={isPending}
            type="submit"
          >
            {formT("submit")}
          </Button>
        )}
      </div>
    </form>
  );
};
