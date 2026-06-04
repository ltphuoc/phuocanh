'use client';

import type { ReactElement } from 'react';
import type { TripDetailAppData } from '@/lib/app-data/types';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deleteTripAction, updateTripAction } from '@/app/actions/planning-actions';
import { LocationPicker } from '@/components/forms/location-picker';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';

interface TripManagementFormsProps {
  readonly data: TripDetailAppData;
}

const appendLocationFields = (payload: FormData, form: HTMLFormElement): void => {
  const formData = new FormData(form);
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
};

const buildUpdateTripSchema = (t: ReturnType<typeof useI18n<'forms.trip'>>['t']) =>
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

type UpdateTripValues = z.infer<ReturnType<typeof buildUpdateTripSchema>>;

export const TripManagementForms = ({ data }: TripManagementFormsProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.trip');
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateMutation = useActionMutation(updateTripAction);
  const deleteMutation = useActionMutation(deleteTripAction);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const form = useForm<UpdateTripValues>({
    defaultValues: {
      endDate: data.trip.endDate,
      note: data.trip.note ?? '',
      startDate: data.trip.startDate,
      title: data.trip.title,
    },
    resolver: zodResolver(buildUpdateTripSchema(formT)),
  });

  const endDateErrorMessage = form.formState.errors.endDate?.message;
  const noteErrorMessage = form.formState.errors.note?.message;
  const startDateErrorMessage = form.formState.errors.startDate?.message;
  const titleErrorMessage = form.formState.errors.title?.message;

  const invalidateTripData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: appQueryKeys.trips() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.trip(data.trip.id) }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.map() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albums() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albumDetails() }),
    ]);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const formElement = document.getElementById('trip-update-form') as HTMLFormElement | null;
    const payload = new FormData();
    payload.set('endDate', values.endDate);
    payload.set('note', values.note ?? '');
    payload.set('startDate', values.startDate);
    payload.set('title', values.title);
    payload.set('tripId', data.trip.id);
    if (formElement) {
      appendLocationFields(payload, formElement);
    }

    try {
      const nextState = await updateMutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      await invalidateTripData();
    } catch (error: unknown) {
      console.error('Failed to update trip', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  });

  const submitDelete = async (): Promise<void> => {
    const payload = new FormData();
    payload.set('confirmation', 'delete');
    payload.set('tripId', data.trip.id);

    try {
      const nextState = await deleteMutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      await invalidateTripData();
      router.replace('/trips');
    } catch (error: unknown) {
      console.error('Failed to delete trip', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        id="trip-update-form"
        className="flex flex-col gap-4"
        noValidate
        onSubmit={onSubmit}
      >
        <FormSection
          errorId="edit-trip-title-error"
          errorMessage={titleErrorMessage}
          htmlFor="editTripTitle"
          label={formT('titleLabel')}
          required
        >
          <Input
            aria-describedby={titleErrorMessage ? 'edit-trip-title-error' : undefined}
            aria-invalid={Boolean(titleErrorMessage)}
            aria-required
            id="editTripTitle"
            type="text"
            {...form.register('title')}
          />
        </FormSection>

        <div className="grid gap-4 md:grid-cols-2">
          <FormSection
            errorId="edit-trip-start-date-error"
            errorMessage={startDateErrorMessage}
            htmlFor="editTripStartDate"
            label={formT('startDateLabel')}
            required
          >
            <Input
              aria-describedby={startDateErrorMessage ? 'edit-trip-start-date-error' : undefined}
              aria-invalid={Boolean(startDateErrorMessage)}
              aria-required
              id="editTripStartDate"
              type="date"
              {...form.register('startDate')}
            />
          </FormSection>
          <FormSection
            errorId="edit-trip-end-date-error"
            errorMessage={endDateErrorMessage}
            htmlFor="editTripEndDate"
            label={formT('endDateLabel')}
            required
          >
            <Input
              aria-describedby={endDateErrorMessage ? 'edit-trip-end-date-error' : undefined}
              aria-invalid={Boolean(endDateErrorMessage)}
              aria-required
              id="editTripEndDate"
              type="date"
              {...form.register('endDate')}
            />
          </FormSection>
        </div>

        <FormSection
          description={formT('locationDescription')}
          htmlFor="editTripLocation"
          label={formT('locationLabel')}
        >
          <LocationPicker
            defaultLocation={data.trip.location}
            inputId="editTripLocation"
            placeholder={formT('locationPlaceholder')}
            searchingLabel={formT('locationSearching')}
          />
        </FormSection>

        <FormSection
          description={formT('noteDescription')}
          errorId="edit-trip-note-error"
          errorMessage={noteErrorMessage}
          htmlFor="editTripNote"
          label={formT('noteLabel')}
        >
          <Textarea
            aria-describedby={noteErrorMessage ? 'edit-trip-note-error' : undefined}
            aria-invalid={Boolean(noteErrorMessage)}
            id="editTripNote"
            rows={5}
            {...form.register('note')}
          />
        </FormSection>

        <Button
          busyLabel={commonT('working')}
          className="w-full md:w-auto"
          isBusy={updateMutation.isPending}
          type="submit"
        >
          {formT('updateSubmit')}
        </Button>
      </form>

      <div className="border-destructive/20 bg-destructive/5 rounded-panel border p-4">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            checked={deleteConfirmed}
            className="mt-1"
            onChange={(event) => setDeleteConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>{formT('deleteConfirm')}</span>
        </label>
        <Button
          className="mt-4 w-full md:w-auto"
          disabled={!deleteConfirmed}
          isBusy={deleteMutation.isPending}
          onClick={() => void submitDelete()}
          type="button"
          variant="outline"
        >
          {formT('deleteSubmit')}
        </Button>
      </div>
    </div>
  );
};
