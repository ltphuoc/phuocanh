'use client';

import type { FormEvent, ReactElement } from 'react';

import { useId, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
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

export const UpdateCoupleTimezoneForm = ({
  currentTimeZone,
}: UpdateCoupleTimezoneFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.settingsTimezone');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(updateCoupleTimezoneAction);
  const formKey = useId();
  const [timeZoneErrorMessage, setTimeZoneErrorMessage] = useState<string | undefined>(undefined);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = new FormData(event.currentTarget);
    const parsed = buildUpdateCoupleTimezoneSchema(formT).safeParse({
      timeZone: payload.get('timeZone'),
    });

    if (!parsed.success) {
      setTimeZoneErrorMessage(parsed.error.flatten().fieldErrors.timeZone?.[0]);
      return;
    }

    setTimeZoneErrorMessage(undefined);

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      setSettingsTimeZone(queryClient, parsed.data.timeZone);
      await invalidateTimezoneDerivedData(queryClient);
    } catch (error: unknown) {
      console.error('Failed to submit couple timezone form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      key={`${formKey}-${currentTimeZone}`}
      onSubmit={onSubmit}
    >
      <FormSection
        description={formT('description')}
        errorId="couple-timezone-error"
        errorMessage={timeZoneErrorMessage}
        htmlFor="coupleTimeZone"
        label={formT('label')}
      >
        <>
          <Input
            aria-describedby={timeZoneErrorMessage ? 'couple-timezone-error' : undefined}
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
            placeholder={formT('placeholder')}
            spellCheck={false}
            type="text"
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
