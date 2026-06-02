'use client';

import type { ReactElement } from 'react';
import type { MemoryDetailAppData } from '@/lib/app-data/types';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deleteMemoryAction, updateMemoryAction } from '@/app/actions/memory-actions';
import { LocationPicker } from '@/components/forms/location-picker';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { appQueryKeys } from '@/lib/query/app-query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface MemoryManagementFormsProps {
  readonly data: MemoryDetailAppData;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;

const isAllowedMediaMimeType = (mimeType: string): boolean =>
  ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const sanitizeFileName = (fileName: string): string =>
  fileName.replaceAll(/[^a-zA-Z0-9.\-_]/g, '_');

const buildStoragePath = (coupleId: string, memoryId: string, fileName: string): string => {
  const safeName = sanitizeFileName(fileName || 'upload');

  return `couples/${coupleId}/memories/${memoryId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
};

const cleanupUploadedMemoryMedia = async (
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  storagePath: string,
): Promise<void> => {
  const { error } = await supabase.storage.from('memory-media').remove([storagePath]);

  if (error) {
    console.error('Failed to clean up uploaded memory media', error);
  }
};

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

const buildUpdateMemorySchema = (t: ReturnType<typeof useI18n<'forms.memory'>>['t']) =>
  z.object({
    happenedAtLocal: z.string().min(1, t('validation.happenedAtRequired')),
    note: z.string().max(800, t('validation.noteMax')).optional(),
  });

type UpdateMemoryValues = z.infer<ReturnType<typeof buildUpdateMemorySchema>>;

export const MemoryManagementForms = ({ data }: MemoryManagementFormsProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.memory');
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateMutation = useActionMutation(updateMemoryAction);
  const deleteMutation = useActionMutation(deleteMemoryAction);
  const [supabase] = useState(createSupabaseBrowserClient);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<Set<string>>(new Set());
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const happenedAt = parseISO(data.memory.happenedAt);
  const happenedAtLocal = Number.isNaN(happenedAt.getTime())
    ? ''
    : format(happenedAt, "yyyy-MM-dd'T'HH:mm");

  const form = useForm<UpdateMemoryValues>({
    defaultValues: {
      happenedAtLocal,
      note: data.memory.note ?? '',
    },
    resolver: zodResolver(buildUpdateMemorySchema(formT)),
  });

  const happenedAtErrorMessage = form.formState.errors.happenedAtLocal?.message;
  const noteErrorMessage = form.formState.errors.note?.message;

  const invalidateMemoryData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: appQueryKeys.home() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.onThisDay() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.memory(data.memory.id) }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.tripDetails() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albums() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.albumDetails() }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.map() }),
    ]);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const formElement = document.getElementById('memory-update-form') as HTMLFormElement | null;
    const payload = new FormData();
    const uploadedStoragePaths: string[] = [];
    payload.set(
      'happenedAt',
      values.happenedAtLocal ? new Date(values.happenedAtLocal).toISOString() : '',
    );
    payload.set('memoryId', data.memory.id);
    payload.set('note', values.note ?? '');
    if (formElement) {
      appendLocationFields(payload, formElement);
    }
    removedMediaIds.forEach((mediaId) => payload.append('removedMediaIds', mediaId));

    try {
      if (mediaFiles.length) {
        setIsUploading(true);
      }

      for (const mediaFile of mediaFiles) {
        if (mediaFile.size > MAX_UPLOAD_BYTES) {
          toast.error(actionsT('memory.fileTooLarge'));
          return;
        }

        if (!isAllowedMediaMimeType(mediaFile.type)) {
          toast.error(actionsT('memory.unsupportedType'));
          return;
        }

        const storagePath = buildStoragePath(data.context.coupleId, data.memory.id, mediaFile.name);
        const { error } = await supabase.storage
          .from('memory-media')
          .upload(storagePath, mediaFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Failed to upload memory media', error);
          toast.error(actionsT('unexpectedError'));
          return;
        }

        uploadedStoragePaths.push(storagePath);
        payload.append('mimeType', mediaFile.type);
        payload.append('originalFileName', mediaFile.name);
        payload.append('sizeBytes', String(mediaFile.size));
        payload.append('storagePath', storagePath);
      }

      const nextState = await updateMutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      await invalidateMemoryData();
      setMediaFiles([]);
      setRemovedMediaIds(new Set());
    } catch (error: unknown) {
      console.error('Failed to update memory', error);
      toast.error(actionsT(getActionErrorMessage(error)));
      for (const uploadedStoragePath of uploadedStoragePaths) {
        await cleanupUploadedMemoryMedia(supabase, uploadedStoragePath);
      }
    } finally {
      setIsUploading(false);
    }
  });

  const submitDelete = async (): Promise<void> => {
    const payload = new FormData();
    payload.set('confirmation', 'delete');
    payload.set('memoryId', data.memory.id);

    try {
      const nextState = await deleteMutation.mutateAsync(payload);
      toast.success(actionsT(nextState.message || 'unexpectedError'));
      await invalidateMemoryData();
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Failed to delete memory', error);
      toast.error(actionsT(getActionErrorMessage(error)));
    }
  };

  const toggleRemovedMediaId = (mediaId: string): void => {
    setRemovedMediaIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }

      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        id="memory-update-form"
        className="flex flex-col gap-4"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormSection
            errorId="edit-happened-at-error"
            errorMessage={happenedAtErrorMessage}
            htmlFor="editHappenedAtLocal"
            label={formT('happenedAtLabel')}
            required
          >
            <Input
              aria-describedby={happenedAtErrorMessage ? 'edit-happened-at-error' : undefined}
              aria-invalid={Boolean(happenedAtErrorMessage)}
              aria-required
              id="editHappenedAtLocal"
              type="datetime-local"
              {...form.register('happenedAtLocal')}
            />
          </FormSection>

          <FormSection
            description={formT('locationDescription')}
            htmlFor="editLocationName"
            label={formT('locationLabel')}
          >
            <LocationPicker
              defaultLocation={data.memory.location}
              inputId="editLocationName"
              placeholder={formT('locationPlaceholder')}
              searchingLabel={formT('locationSearching')}
            />
          </FormSection>
        </div>

        <FormSection
          description={formT('noteDescription')}
          errorId="edit-memory-note-error"
          errorMessage={noteErrorMessage}
          htmlFor="editMemoryNote"
          label={formT('noteLabel')}
        >
          <Textarea
            aria-describedby={noteErrorMessage ? 'edit-memory-note-error' : undefined}
            aria-invalid={Boolean(noteErrorMessage)}
            id="editMemoryNote"
            placeholder={formT('notePlaceholder')}
            rows={5}
            {...form.register('note')}
          />
        </FormSection>

        {data.media.length ? (
          <FormSection label={formT('existingMediaLabel')}>
            <div className="grid gap-2">
              {data.media.map((media) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-white/72 bg-white/70 px-4 py-3 text-sm"
                  key={media.id}
                >
                  <span className="break-all text-muted-foreground">{media.storagePath}</span>
                  <span className="flex shrink-0 items-center gap-2 font-semibold text-foreground">
                    <input
                      checked={removedMediaIds.has(media.id)}
                      onChange={() => toggleRemovedMediaId(media.id)}
                      type="checkbox"
                    />
                    {formT('removeMedia')}
                  </span>
                </label>
              ))}
            </div>
          </FormSection>
        ) : null}

        <FormSection
          description={formT('mediaDescription')}
          htmlFor="editMemoryMedia"
          label={formT('mediaLabel')}
        >
          <Input
            accept="image/*,video/*"
            id="editMemoryMedia"
            multiple
            onChange={(event) => setMediaFiles(Array.from(event.target.files ?? []))}
            type="file"
          />
          {mediaFiles.length ? (
            <p
              aria-live="polite"
              className="mt-2 text-xs font-medium text-muted-foreground"
            >
              {formT('mediaSelected', { count: mediaFiles.length })}
            </p>
          ) : null}
        </FormSection>

        <Button
          busyLabel={commonT('working')}
          className="w-full md:w-auto"
          isBusy={updateMutation.isPending || isUploading}
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
