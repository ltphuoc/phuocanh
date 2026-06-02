'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createTripAction } from '@/app/actions/planning-actions';
import { LocationPicker } from '@/components/forms/location-picker';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { formatDateInputValue } from '@/lib/utils/date-input';

const buildCreateTripSchema = (t: ReturnType<typeof useI18n<'forms.trip'>>['t']) =>
  z
    .object({
      endDate: z.string().min(1, t('validation.endDateRequired')),
      note: z.string().max(2000, t('validation.noteMax')).optional(),
      startDate: z.string().min(1, t('validation.startDateRequired')),
      title: z
        .string()
        .trim()
        .min(1, t('validation.titleRequired'))
        .max(120, t('validation.titleMax')),
    })
    .refine(({ endDate, startDate }) => endDate >= startDate, {
      message: t('validation.dateRangeInvalid'),
      path: ['endDate'],
    });

type CreateTripValues = z.infer<ReturnType<typeof buildCreateTripSchema>>;

export const CreateTripForm = (): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.trip');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createTripAction);
  const [locationPickerResetKey, setLocationPickerResetKey] = useState(0);
  const form = useForm<CreateTripValues>({
    defaultValues: {
      endDate: formatDateInputValue(addDays(new Date(), 17)),
      note: '',
      startDate: formatDateInputValue(addDays(new Date(), 14)),
      title: '',
    },
    resolver: zodResolver(buildCreateTripSchema(formT)),
  });
  const startDateValue = useWatch({
    control: form.control,
    name: 'startDate',
  });

  const endDateErrorMessage = form.formState.errors.endDate?.message;
  const noteErrorMessage = form.formState.errors.note?.message;
  const startDateErrorMessage = form.formState.errors.startDate?.message;
  const titleErrorMessage = form.formState.errors.title?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('endDate', values.endDate);
    payload.set('note', values.note ?? '');
    payload.set('startDate', values.startDate);
    payload.set('title', values.title);
    const formElement = document.getElementById('create-trip-form') as HTMLFormElement | null;
    if (formElement) {
      const formData = new FormData(formElement);
      [
        'locationName',
        'locationAddress',
        'locationLatitude',
        'locationLongitude',
        'locationProvider',
        'locationProviderId',
      ].forEach((key) => {
        const value = formData.get(key);
        if (typeof value === 'string') {
          payload.set(key, value);
        }
      });
    }

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      form.reset({
        endDate: formatDateInputValue(addDays(new Date(), 17)),
        note: '',
        startDate: formatDateInputValue(addDays(new Date(), 14)),
        title: '',
      });
      setLocationPickerResetKey((key) => key + 1);
      await queryClient.invalidateQueries({ queryKey: appQueryKeys.trips() });
    } catch (error: unknown) {
      console.error('Failed to submit trip form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      id="create-trip-form"
      className="flex flex-col gap-4"
      noValidate
      onSubmit={onSubmit}
    >
      <FormSection
        errorId="trip-title-error"
        errorMessage={titleErrorMessage}
        htmlFor="tripTitle"
        label={formT('titleLabel')}
        required
      >
        <Input
          aria-describedby={titleErrorMessage ? 'trip-title-error' : undefined}
          aria-invalid={Boolean(titleErrorMessage)}
          aria-required
          id="tripTitle"
          placeholder={formT('titlePlaceholder')}
          type="text"
          {...form.register('title')}
        />
      </FormSection>

      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          description={formT('startDateDescription')}
          errorId="trip-start-date-error"
          errorMessage={startDateErrorMessage}
          htmlFor="tripStartDate"
          label={formT('startDateLabel')}
          required
        >
          <Input
            aria-describedby={startDateErrorMessage ? 'trip-start-date-error' : undefined}
            aria-invalid={Boolean(startDateErrorMessage)}
            aria-required
            id="tripStartDate"
            type="date"
            {...form.register('startDate')}
          />
        </FormSection>

        <FormSection
          description={formT('endDateDescription')}
          errorId="trip-end-date-error"
          errorMessage={endDateErrorMessage}
          htmlFor="tripEndDate"
          label={formT('endDateLabel')}
          required
        >
          <Input
            aria-describedby={endDateErrorMessage ? 'trip-end-date-error' : undefined}
            aria-invalid={Boolean(endDateErrorMessage)}
            aria-required
            id="tripEndDate"
            min={startDateValue}
            type="date"
            {...form.register('endDate')}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT('locationDescription')}
        htmlFor="tripLocation"
        label={formT('locationLabel')}
      >
        <LocationPicker
          inputId="tripLocation"
          key={locationPickerResetKey}
          placeholder={formT('locationPlaceholder')}
          searchingLabel={formT('locationSearching')}
        />
      </FormSection>

      <FormSection
        description={formT('noteDescription')}
        errorId="trip-note-error"
        errorMessage={noteErrorMessage}
        htmlFor="tripNote"
        label={formT('noteLabel')}
      >
        <Textarea
          aria-describedby={noteErrorMessage ? 'trip-note-error' : undefined}
          aria-invalid={Boolean(noteErrorMessage)}
          id="tripNote"
          placeholder={formT('notePlaceholder')}
          rows={5}
          {...form.register('note')}
        />
      </FormSection>

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
