'use client';

import type { ReactElement } from 'react';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateCoupleTimezoneAction } from '@/app/actions/planning-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateTimezoneDerivedData, setSettingsTimeZone } from '@/lib/query/app-query-updates';
import {
  getSupportedCoupleTimeZones,
  isSupportedCoupleTimeZone,
} from '@/lib/utils/couple-timezone';

const COUPLE_TIME_ZONE_OPTIONS = getSupportedCoupleTimeZones();
const TIME_ZONE_DATALIST_ID = 'couple-timezone-options';

interface UpdateCoupleTimezoneFormProps {
  readonly currentTimeZone: string;
}

const buildUpdateCoupleTimezoneSchema = (
  t: ReturnType<typeof useI18n<'forms.settingsTimezone'>>['t'],
) =>
  z.object({
    timeZone: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .refine((value) => isSupportedCoupleTimeZone(value), {
        message: t('validation.invalid'),
      }),
  });

type UpdateCoupleTimezoneValues = z.infer<ReturnType<typeof buildUpdateCoupleTimezoneSchema>>;

export const UpdateCoupleTimezoneForm = ({
  currentTimeZone,
}: UpdateCoupleTimezoneFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.settingsTimezone');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(updateCoupleTimezoneAction);
  const form = useForm<UpdateCoupleTimezoneValues>({
    defaultValues: {
      timeZone: currentTimeZone,
    },
    resolver: zodResolver(buildUpdateCoupleTimezoneSchema(formT)),
  });

  const timeZoneErrorMessage = form.formState.errors.timeZone?.message;
  // The timezone the user has confirmed they want to switch to is pending; null when
  // no destructive change is awaiting confirmation.
  const [pendingTimeZone, setPendingTimeZone] = useState<string | null>(null);
  const timeZoneField = form.register('timeZone');

  // Re-sync the field when the saved timezone changes (e.g. a refetch on tab focus,
  // or the partner saves a new timezone on another device). Skip when the user has
  // unsaved typing so a background refetch can't wipe a mid-keystroke value — this
  // couples app explicitly supports two devices.
  useEffect(() => {
    if (form.formState.isDirty) {
      return;
    }
    form.reset({
      timeZone: currentTimeZone,
    });
  }, [currentTimeZone, form]);

  const applyTimeZoneChange = async (timeZone: string): Promise<void> => {
    const payload = new FormData();
    payload.set('timeZone', timeZone);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      setSettingsTimeZone(queryClient, timeZone);
      // Update defaults to the just-saved value so `isDirty` clears and subsequent
      // external prop changes can flow through the sync effect above.
      form.reset({
        timeZone,
      });
      await invalidateTimezoneDerivedData(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit couple timezone form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    } finally {
      setPendingTimeZone(null);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    // An unchanged zone triggers no round reconciliation, so it can save straight
    // through. A changed zone runs update_couple_timezone(), which silently clears
    // today's / future not-yet-revealed game rounds (including a submitted-but-locked
    // answer) — gate it behind an explicit confirmation first.
    if (values.timeZone === currentTimeZone) {
      await applyTimeZoneChange(values.timeZone);
      return;
    }

    setPendingTimeZone(values.timeZone);
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={onSubmit}
    >
      <FormSection
        description={formT('description')}
        errorId="couple-timezone-error"
        errorMessage={timeZoneErrorMessage}
        htmlFor="coupleTimeZone"
        label={formT('label')}
        required
      >
        <>
          <Input
            aria-describedby={timeZoneErrorMessage ? 'couple-timezone-error' : undefined}
            aria-invalid={Boolean(timeZoneErrorMessage)}
            aria-required
            autoComplete="off"
            id="coupleTimeZone"
            list={TIME_ZONE_DATALIST_ID}
            placeholder={formT('placeholder')}
            spellCheck={false}
            type="text"
            {...timeZoneField}
            onChange={(event) => {
              void timeZoneField.onChange(event);
              // Editing the field dismisses any pending confirmation, so confirm always
              // applies the value currently shown rather than a stale captured one.
              if (pendingTimeZone !== null) {
                setPendingTimeZone(null);
              }
            }}
          />
          <datalist id={TIME_ZONE_DATALIST_ID}>
            {COUPLE_TIME_ZONE_OPTIONS.map((timeZone) => (
              <option
                key={timeZone}
                value={timeZone}
              />
            ))}
          </datalist>
        </>
      </FormSection>

      <p className="text-xs tracking-meta text-muted-foreground uppercase">
        {formT('currentValue', {
          timeZone: currentTimeZone,
        })}
      </p>

      {pendingTimeZone ? (
        <div
          aria-describedby="couple-timezone-confirm-warning"
          className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-panel border p-4"
          role="alertdialog"
        >
          <p
            className="text-sm text-foreground"
            id="couple-timezone-confirm-warning"
          >
            {formT('confirmWarning')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              busyLabel={commonT('working')}
              className="w-full sm:w-auto"
              isBusy={mutation.isPending}
              onClick={() => void applyTimeZoneChange(pendingTimeZone)}
              type="button"
            >
              {formT('confirmProceed')}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={mutation.isPending}
              onClick={() => setPendingTimeZone(null)}
              type="button"
              variant="outline"
            >
              {formT('confirmCancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          busyLabel={commonT('working')}
          className="w-full md:w-auto"
          isBusy={mutation.isPending}
          type="submit"
        >
          {formT('submit')}
        </Button>
      )}
    </form>
  );
};
