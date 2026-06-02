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
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateMemoryCreated } from '@/lib/query/app-query-updates';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const buildCreateMemorySchema = (t: ReturnType<typeof useI18n<'forms.memory'>>['t']) =>
  z.object({
    happenedAtLocal: z.string().min(1, t('validation.happenedAtRequired')),
    note: z.string().max(800, t('validation.noteMax')).optional(),
  });

type CreateMemoryValues = z.infer<ReturnType<typeof buildCreateMemorySchema>>;

interface CreateMemoryFormProps {
  readonly coupleId: string;
  readonly defaultHappenedAt?: string;
  readonly redirectHref?: '/home' | `/trips/${string}`;
}

const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
  const [supabase] = useState(createSupabaseBrowserClient);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
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
    const memoryId = crypto.randomUUID();
    payload.set('happenedAt', new Date(values.happenedAtLocal).toISOString());
    payload.set('memoryId', memoryId);
    payload.set('note', values.note ?? '');
    const formElement = document.getElementById('create-memory-form') as HTMLFormElement | null;
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
    const uploadedStoragePaths: string[] = [];

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

        const storagePath = buildStoragePath(coupleId, memoryId, mediaFile.name);

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

      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      await invalidateMemoryCreated(queryClient);
      router.replace(redirectHref);
    } catch (error: unknown) {
      console.error('Failed to submit memory form', error);
      toast.error(actionsT(getActionErrorMessage(error)));

      for (const uploadedStoragePath of uploadedStoragePaths) {
        await cleanupUploadedMemoryMedia(supabase, uploadedStoragePath);
      }
    } finally {
      setIsUploading(false);
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
        isBusy={mutation.isPending || isUploading}
        type="submit"
      >
        {formT('submit')}
      </Button>
    </form>
  );
};
