'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createMemoryAction } from '@/app/actions/memory-actions';
import { LocationPicker } from '@/components/forms/location-picker';
import { useMemoryMediaUploads } from '@/components/forms/use-memory-media-uploads';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { MEMORY_NOTE_MAX_LENGTH } from '@/lib/media/memory-media-validation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateMemoryCreated } from '@/lib/query/app-query-updates';

const buildCreateMemorySchema = (t: ReturnType<typeof useI18n<'forms.memory'>>['t']) =>
  z.object({
    happenedAtLocal: z.string().min(1, t('validation.happenedAtRequired')),
    note: z.string().max(MEMORY_NOTE_MAX_LENGTH, t('validation.noteMax')).optional(),
  });

type CreateMemoryValues = z.infer<ReturnType<typeof buildCreateMemorySchema>>;

interface CreateMemoryFormProps {
  readonly coupleId: string;
  readonly defaultHappenedAt?: string;
  readonly redirectHref?: '/home' | `/trips/${string}`;
}

const LOCATION_FIELD_KEYS = [
  'locationName',
  'locationAddress',
  'locationLatitude',
  'locationLongitude',
  'locationProvider',
  'locationProviderId',
] as const;

export const CreateMemoryForm = ({
  coupleId,
  defaultHappenedAt,
  redirectHref = '/home',
}: CreateMemoryFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.memory');
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createMemoryAction);
  // Stable for the form's lifetime so media uploaded on selection land under the
  // same memory id that the submit will create.
  const [memoryId] = useState(() => crypto.randomUUID());
  const { uploads, isUploading, addFiles, removeUpload, clearTracking, cleanupAll } =
    useMemoryMediaUploads(coupleId, memoryId);
  const defaultDate = defaultHappenedAt ? parseISO(defaultHappenedAt) : new Date();
  const form = useForm<CreateMemoryValues>({
    defaultValues: {
      happenedAtLocal: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
      note: '',
    },
    resolver: zodResolver(buildCreateMemorySchema(formT)),
  });

  const happenedAtErrorMessage = form.formState.errors.happenedAtLocal?.message;
  const noteErrorMessage = form.formState.errors.note?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('happenedAt', new Date(values.happenedAtLocal).toISOString());
    payload.set('memoryId', memoryId);
    payload.set('note', values.note ?? '');
    const formElement = document.getElementById('create-memory-form') as HTMLFormElement | null;
    if (formElement) {
      const formData = new FormData(formElement);
      LOCATION_FIELD_KEYS.forEach((key) => {
        const value = formData.get(key);
        if (typeof value === 'string') {
          payload.set(key, value);
        }
      });
    }

    for (const upload of uploads) {
      payload.append('mimeType', upload.mimeType);
      payload.append('originalFileName', upload.originalFileName);
      payload.append('sizeBytes', String(upload.sizeBytes));
      payload.append('storagePath', upload.storagePath);
    }

    try {
      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      // Ownership of the uploaded objects passes to the created memory; clear the
      // tracking ref BEFORE navigating so the unmount cleanup does not delete them.
      clearTracking();
      await invalidateMemoryCreated(queryClient);
      router.replace(redirectHref);
    } catch (error: unknown) {
      console.error('Failed to submit memory form', error);
      toast.error(actionsT(getActionErrorMessage(error)));
      // Submit failed: the uploaded objects are now orphaned, remove them.
      await cleanupAll();
    }
  });

  return (
    <form
      id="create-memory-form"
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          description={formT('happenedAtDescription')}
          errorId="create-memory-happened-at-error"
          errorMessage={happenedAtErrorMessage}
          htmlFor="happenedAtLocal"
          label={formT('happenedAtLabel')}
          required
        >
          <Input
            aria-describedby={
              happenedAtErrorMessage ? 'create-memory-happened-at-error' : undefined
            }
            aria-invalid={Boolean(happenedAtErrorMessage)}
            aria-required
            id="happenedAtLocal"
            type="datetime-local"
            {...form.register('happenedAtLocal')}
          />
        </FormSection>

        <FormSection
          description={formT('locationDescription')}
          htmlFor="locationName"
          label={formT('locationLabel')}
        >
          <LocationPicker
            inputId="locationName"
            placeholder={formT('locationPlaceholder')}
            searchingLabel={formT('locationSearching')}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT('noteDescription')}
        errorId="create-memory-note-error"
        errorMessage={noteErrorMessage}
        htmlFor="note"
        label={formT('noteLabel')}
      >
        <Textarea
          aria-describedby={noteErrorMessage ? 'create-memory-note-error' : undefined}
          aria-invalid={Boolean(noteErrorMessage)}
          id="note"
          placeholder={formT('notePlaceholder')}
          rows={5}
          {...form.register('note')}
        />
      </FormSection>

      <FormSection
        description={formT('mediaDescription')}
        htmlFor="media"
        label={formT('mediaLabel')}
      >
        <Input
          id="media"
          name="media"
          accept="image/*,video/*"
          multiple
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files ?? []);
            // Reset the native picker so the same file can be re-selected after
            // removal; our own list is the source of truth.
            event.target.value = '';
            void addFiles(selectedFiles);
          }}
          type="file"
        />
        {uploads.length ? (
          <ul
            aria-live="polite"
            className="mt-2 flex flex-col gap-1"
          >
            {uploads.map((upload) => (
              <li
                key={upload.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate font-medium text-muted-foreground">
                  {upload.originalFileName}
                </span>
                <button
                  aria-label={`${formT('removeMedia')} ${upload.originalFileName}`}
                  className="text-destructive shrink-0 font-semibold hover:underline"
                  onClick={() => void removeUpload(upload.id)}
                  type="button"
                >
                  {formT('removeMedia')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </FormSection>

      <Button
        busyLabel={commonT('working')}
        className="w-full md:w-auto"
        isBusy={mutation.isPending || isUploading}
        type="submit"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
