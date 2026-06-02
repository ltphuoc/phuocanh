'use client';

import type { ReactElement } from 'react';

import { useEffect } from 'react';

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

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('timeZone', values.timeZone);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      setSettingsTimeZone(queryClient, values.timeZone);
      // Update defaults to the just-saved value so `isDirty` clears and subsequent
      // external prop changes can flow through the sync effect above.
      form.reset({
        timeZone: values.timeZone,
      });
      await invalidateTimezoneDerivedData(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit couple timezone form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
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
            {...form.register('timeZone')}
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

      <p className="text-xs tracking-[0.06em] text-muted-foreground uppercase">
        {formT('currentValue', {
          timeZone: currentTimeZone,
        })}
      </p>

      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending}
        type="submit"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
