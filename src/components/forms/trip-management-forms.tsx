'use client';

import type { ReactElement } from 'react';
import type { TripDetailAppData } from '@/lib/app-data/types';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export const TripManagementForms = ({ data }: TripManagementFormsProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.trip');
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateMutation = useActionMutation(updateTripAction);
  const deleteMutation = useActionMutation(deleteTripAction);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const invalidateTripData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: appQueryKeys.trips() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.trip(data.trip.id) }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.map() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albums() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albumDetails() }),
    ]);
  };

  const submitUpdate = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = new FormData();
    payload.set('endDate', String(formData.get('endDate') ?? ''));
    payload.set('note', String(formData.get('note') ?? ''));
    payload.set('startDate', String(formData.get('startDate') ?? ''));
    payload.set('title', String(formData.get('title') ?? ''));
    payload.set('tripId', data.trip.id);
    appendLocationFields(payload, form);

    try {
      const nextState = await updateMutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      await invalidateTripData();
    } catch (error: unknown) {
      console.error('Failed to update trip', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

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
        className="flex flex-col gap-4"
        onSubmit={(event) => void submitUpdate(event)}
      >
        <FormSection
          htmlFor="editTripTitle"
          label={formT('titleLabel')}
        >
          <Input
            defaultValue={data.trip.title}
            id="editTripTitle"
            name="title"
            type="text"
          />
        </FormSection>

        <div className="grid gap-4 md:grid-cols-2">
          <FormSection
            htmlFor="editTripStartDate"
            label={formT('startDateLabel')}
          >
            <Input
              defaultValue={data.trip.startDate}
              id="editTripStartDate"
              name="startDate"
              type="date"
            />
          </FormSection>
          <FormSection
            htmlFor="editTripEndDate"
            label={formT('endDateLabel')}
          >
            <Input
              defaultValue={data.trip.endDate}
              id="editTripEndDate"
              name="endDate"
              type="date"
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
          htmlFor="editTripNote"
          label={formT('noteLabel')}
        >
          <Textarea
            defaultValue={data.trip.note ?? ''}
            id="editTripNote"
            name="note"
            rows={5}
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

      <div className="border-destructive/20 bg-destructive/5 rounded-[var(--radius-panel)] border p-4">
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
