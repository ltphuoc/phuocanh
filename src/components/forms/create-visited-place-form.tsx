'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createVisitedPlaceAction } from '@/app/actions/planning-actions';
import { LocationPicker } from '@/components/forms/location-picker';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { formatDateInputValue } from '@/lib/utils/date-input';

interface CreateVisitedPlaceFormProps {
  readonly endDate: string;
  readonly startDate: string;
  readonly tripId: string;
}

const getDefaultVisitedOn = (startDate: string, endDate: string): string => {
  const today = formatDateInputValue(new Date());
  if (today < startDate) {
    return startDate;
  }

  if (today > endDate) {
    return endDate;
  }

  return today;
};

const buildCreateVisitedPlaceSchema = (
  t: ReturnType<typeof useI18n<'forms.visitedPlace'>>['t'],
  startDate: string,
  endDate: string,
) =>
  z
    .object({
      note: z.string().max(800, t('validation.noteMax')).optional(),
      title: z
        .string()
        .trim()
        .min(1, t('validation.titleRequired'))
        .max(120, t('validation.titleMax')),
      visitedOn: z.string().min(1, t('validation.visitedOnRequired')),
    })
    .refine(({ visitedOn }) => visitedOn >= startDate && visitedOn <= endDate, {
      message: t('validation.visitedOnRange'),
      path: ['visitedOn'],
    });

type CreateVisitedPlaceValues = z.infer<ReturnType<typeof buildCreateVisitedPlaceSchema>>;

export const CreateVisitedPlaceForm = ({
  endDate,
  startDate,
  tripId,
}: CreateVisitedPlaceFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.visitedPlace');
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createVisitedPlaceAction);
  const defaultVisitedOn = getDefaultVisitedOn(startDate, endDate);
  const [locationPickerResetKey, setLocationPickerResetKey] = useState(0);
  const form = useForm<CreateVisitedPlaceValues>({
    defaultValues: {
      note: '',
      title: '',
      visitedOn: defaultVisitedOn,
    },
    resolver: zodResolver(buildCreateVisitedPlaceSchema(formT, startDate, endDate)),
  });

  const noteErrorMessage = form.formState.errors.note?.message;
  const titleErrorMessage = form.formState.errors.title?.message;
  const visitedOnErrorMessage = form.formState.errors.visitedOn?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('note', values.note ?? '');
    payload.set('title', values.title);
    payload.set('tripId', tripId);
    payload.set('visitedOn', values.visitedOn);
    const formElement = document.getElementById(
      'create-visited-place-form',
    ) as HTMLFormElement | null;
    if (formElement) {
      const formData = new FormData(formElement);
      [
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
        note: '',
        title: '',
        visitedOn: defaultVisitedOn,
      });
      setLocationPickerResetKey((key) => key + 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: appQueryKeys.map() }),
        queryClient.invalidateQueries({ queryKey: appQueryKeys.trip(tripId) }),
      ]);
    } catch (error: unknown) {
      console.error('Failed to submit visited place form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  return (
    <form
      id="create-visited-place-form"
      className="flex flex-col gap-4"
      noValidate
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          errorId="visited-place-title-error"
          errorMessage={titleErrorMessage}
          htmlFor="visitedPlaceTitle"
          label={formT('titleLabel')}
          required
        >
          <Input
            aria-describedby={titleErrorMessage ? 'visited-place-title-error' : undefined}
            aria-invalid={Boolean(titleErrorMessage)}
            aria-required
            id="visitedPlaceTitle"
            placeholder={formT('titlePlaceholder')}
            type="text"
            {...form.register('title')}
          />
        </FormSection>

        <FormSection
          description={formT('visitedOnDescription')}
          errorId="visited-place-date-error"
          errorMessage={visitedOnErrorMessage}
          htmlFor="visitedPlaceDate"
          label={formT('visitedOnLabel')}
          required
        >
          <Input
            aria-describedby={visitedOnErrorMessage ? 'visited-place-date-error' : undefined}
            aria-invalid={Boolean(visitedOnErrorMessage)}
            aria-required
            id="visitedPlaceDate"
            max={endDate}
            min={startDate}
            type="date"
            {...form.register('visitedOn')}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT('locationDescription')}
        htmlFor="visitedPlaceLocation"
        label={formT('locationLabel')}
      >
        <LocationPicker
          inputId="visitedPlaceLocation"
          key={locationPickerResetKey}
          placeholder={formT('locationPlaceholder')}
          searchingLabel={formT('locationSearching')}
        />
      </FormSection>

      <FormSection
        description={formT('noteDescription')}
        errorId="visited-place-note-error"
        errorMessage={noteErrorMessage}
        htmlFor="visitedPlaceNote"
        label={formT('noteLabel')}
      >
        <Textarea
          aria-describedby={noteErrorMessage ? 'visited-place-note-error' : undefined}
          aria-invalid={Boolean(noteErrorMessage)}
          id="visitedPlaceNote"
          placeholder={formT('notePlaceholder')}
          rows={4}
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
