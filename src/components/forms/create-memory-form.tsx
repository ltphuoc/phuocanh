'use client';

import type { ReactElement } from 'react';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createMemoryAction } from '@/app/actions/memory-actions';
import { FormSection } from '@/components/layout/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { useRouter } from '@/i18n/navigation';
import { getActionErrorMessage, useActionMutation } from '@/lib/query/action-mutation';
import { invalidateMemoryCreated } from '@/lib/query/app-query-updates';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const createMemorySchema = z.object({
  happenedAtLocal: z.string().min(1),
  locationName: z.string().max(180).optional(),
  note: z.string().max(800).optional(),
});

type CreateMemoryValues = z.infer<typeof createMemorySchema>;

interface CreateMemoryFormProps {
  readonly coupleId: string;
}

const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const isAllowedMediaMimeType = (mimeType: string): boolean =>
  ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const sanitizeFileName = (fileName: string): string =>
  fileName.replaceAll(/[^a-zA-Z0-9.\-_]/g, '_');

const buildStoragePath = (coupleId: string, fileName: string): string => {
  const clientUploadId = crypto.randomUUID();
  const safeName = sanitizeFileName(fileName || 'upload');

  return `couples/${coupleId}/memories/${clientUploadId}/${Date.now()}-${safeName}`;
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

export const CreateMemoryForm = ({ coupleId }: CreateMemoryFormProps): ReactElement => {
  const { t: actionsT } = useI18n('actions');
  const { t: commonT } = useI18n('common');
  const { t: formT } = useI18n('forms.memory');
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useActionMutation(createMemoryAction);
  const [supabase] = useState(createSupabaseBrowserClient);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const form = useForm<CreateMemoryValues>({
    defaultValues: {
      happenedAtLocal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      locationName: '',
      note: '',
    },
    resolver: zodResolver(createMemorySchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set('happenedAt', new Date(values.happenedAtLocal).toISOString());
    payload.set('locationName', values.locationName ?? '');
    payload.set('note', values.note ?? '');
    let uploadedStoragePath: string | null = null;

    try {
      if (mediaFile) {
        if (mediaFile.size > MAX_UPLOAD_BYTES) {
          toast.error(actionsT('memory.fileTooLarge'));
          return;
        }

        if (!isAllowedMediaMimeType(mediaFile.type)) {
          toast.error(actionsT('memory.unsupportedType'));
          return;
        }

        const storagePath = buildStoragePath(coupleId, mediaFile.name);
        setIsUploading(true);

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

        uploadedStoragePath = storagePath;
        payload.set('mimeType', mediaFile.type);
        payload.set('originalFileName', mediaFile.name);
        payload.set('sizeBytes', String(mediaFile.size));
        payload.set('storagePath', storagePath);
      }

      const nextState = await mutation.mutateAsync(payload);
      const actionMessageKey = nextState.message || 'unexpectedError';
      toast.success(actionsT(actionMessageKey));
      await invalidateMemoryCreated(queryClient);
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Failed to submit memory form', error);
      toast.error(actionsT(getActionErrorMessage(error)));

      if (uploadedStoragePath) {
        await cleanupUploadedMemoryMedia(supabase, uploadedStoragePath);
      }
    } finally {
      setIsUploading(false);
    }
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection
          description={formT('happenedAtDescription')}
          htmlFor="happenedAtLocal"
          label={formT('happenedAtLabel')}
        >
          <Input
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
          <Input
            id="locationName"
            placeholder={formT('locationPlaceholder')}
            type="text"
            {...form.register('locationName')}
          />
        </FormSection>
      </div>

      <FormSection
        description={formT('noteDescription')}
        htmlFor="note"
        label={formT('noteLabel')}
      >
        <Textarea
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
          onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
          type="file"
        />
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
