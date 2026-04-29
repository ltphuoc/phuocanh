'use server';

import type { ActionState } from '@/lib/actions/action-state';
import type { Database } from '@/lib/supabase/database.types';
import type { AppSupabaseClient } from '@/lib/supabase/server';

import { z } from 'zod';

import { createErrorState, createSuccessState } from '@/lib/actions/action-state';
import { revalidateLocalizedPath } from '@/lib/i18n/revalidate';
import { requireReadyCoupleContext } from '@/lib/server/couple-context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;
const MEMORY_UPLOAD_PATH_PATTERN =
  /^couples\/([0-9a-f-]{36})\/memories\/([0-9a-f-]{36})\/([0-9]+)-([A-Za-z0-9._-]+)$/i;

const createMemorySchema = z
  .object({
    happenedAt: z.iso.datetime(),
    locationName: z.string().max(180).optional(),
    mimeType: z.string().trim().min(1).optional(),
    note: z.string().max(800).optional(),
    originalFileName: z.string().trim().min(1).max(255).optional(),
    sizeBytes: z.coerce.number().int().positive().max(MAX_UPLOAD_BYTES).optional(),
    storagePath: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    const hasUploadMetadata =
      value.storagePath !== undefined ||
      value.mimeType !== undefined ||
      value.originalFileName !== undefined ||
      value.sizeBytes !== undefined;

    if (!hasUploadMetadata) {
      return;
    }

    if (!value.storagePath) {
      context.addIssue({
        code: 'custom',
        message: 'Storage path is required when media metadata is provided.',
        path: ['storagePath'],
      });
    }

    if (!value.mimeType) {
      context.addIssue({
        code: 'custom',
        message: 'Mime type is required when media metadata is provided.',
        path: ['mimeType'],
      });
    }

    if (value.sizeBytes === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Size is required when media metadata is provided.',
        path: ['sizeBytes'],
      });
    }
  });

const isAllowedMediaMimeType = (mimeType: string): boolean =>
  ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const getOptionalFormDataValue = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
};

const removeUploadedStorageObject = async (
  supabase: AppSupabaseClient,
  uploadedStoragePath: string | null,
): Promise<string | null> => {
  if (!uploadedStoragePath) {
    return null;
  }

  const { error } = await supabase.storage.from('memory-media').remove([uploadedStoragePath]);

  return error ? error.message : null;
};

const isValidMemoryUploadPath = (storagePath: string, coupleId: string): boolean => {
  const match = MEMORY_UPLOAD_PATH_PATTERN.exec(storagePath);
  return match?.[1] === coupleId;
};

const detectMediaType = (mimeType: string): Database['public']['Enums']['media_type'] => {
  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  return 'image';
};

const rollbackMemoryMutation = async (
  supabase: AppSupabaseClient,
  memoryId: string,
  uploadedStoragePath: string | null,
): Promise<string | null> => {
  const cleanupErrors: string[] = [];

  if (uploadedStoragePath) {
    const { error: removeObjectError } = await supabase.storage
      .from('memory-media')
      .remove([uploadedStoragePath]);
    if (removeObjectError) {
      cleanupErrors.push(removeObjectError.message);
    }
  }

  const { error: deleteMemoryError } = await supabase.from('memories').delete().eq('id', memoryId);

  if (deleteMemoryError) {
    cleanupErrors.push(deleteMemoryError.message);
  }

  if (!cleanupErrors.length) {
    return null;
  }

  return cleanupErrors.join('; ');
};

export const createMemoryAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createMemorySchema.parse({
      happenedAt: formData.get('happenedAt'),
      locationName: getOptionalFormDataValue(formData, 'locationName'),
      mimeType: getOptionalFormDataValue(formData, 'mimeType'),
      note: getOptionalFormDataValue(formData, 'note'),
      originalFileName: getOptionalFormDataValue(formData, 'originalFileName'),
      sizeBytes: getOptionalFormDataValue(formData, 'sizeBytes'),
      storagePath: getOptionalFormDataValue(formData, 'storagePath'),
    });

    const supabase = await createSupabaseServerClient();
    const trimmedNote = parsed.note?.trim() ?? '';
    const hasFile = parsed.storagePath !== undefined;
    const uploadedStoragePath = parsed.storagePath ?? null;

    if (!hasFile && !trimmedNote) {
      return createErrorState('memory.missingContent');
    }

    if (parsed.mimeType && !isAllowedMediaMimeType(parsed.mimeType)) {
      return createErrorState('memory.unsupportedType');
    }

    if (uploadedStoragePath && !isValidMemoryUploadPath(uploadedStoragePath, context.coupleId)) {
      console.error('Memory upload storage path did not match the active couple context', {
        coupleId: context.coupleId,
        storagePath: uploadedStoragePath,
      });
      await removeUploadedStorageObject(supabase, uploadedStoragePath);
      return createErrorState('unexpectedError');
    }

    const { data: insertedMemories, error: memoryError } = await supabase
      .from('memories')
      .insert({
        author_user_id: context.userId,
        couple_id: context.coupleId,
        happened_at: parsed.happenedAt,
        location_name: parsed.locationName?.trim() || null,
        note: trimmedNote || null,
      })
      .select('*')
      .limit(1);

    if (memoryError) {
      const cleanupError = await removeUploadedStorageObject(supabase, uploadedStoragePath);
      if (cleanupError) {
        console.error('Memory upload cleanup failed after memory row error', cleanupError);
      }
      console.error('Failed to create memory row', memoryError);
      return createErrorState('unexpectedError');
    }

    const memory = insertedMemories[0];
    if (!memory) {
      const cleanupError = await removeUploadedStorageObject(supabase, uploadedStoragePath);
      if (cleanupError) {
        console.error(
          'Memory upload cleanup failed after empty memory insert result',
          cleanupError,
        );
      }
      return createErrorState('memory.createFailed');
    }

    if (uploadedStoragePath && parsed.mimeType && parsed.sizeBytes !== undefined) {
      const { error: mediaError } = await supabase.from('memory_media').insert({
        couple_id: context.coupleId,
        media_type: detectMediaType(parsed.mimeType),
        memory_id: memory.id,
        mime_type: parsed.mimeType,
        original_file_name: parsed.originalFileName?.trim() || null,
        size_bytes: parsed.sizeBytes,
        storage_path: uploadedStoragePath,
      });

      if (mediaError) {
        const cleanupError = await rollbackMemoryMutation(supabase, memory.id, uploadedStoragePath);
        if (cleanupError) {
          console.error('Media save rollback failed', cleanupError);
        }

        console.error('Failed to store media metadata', mediaError);
        return createErrorState('unexpectedError');
      }
    }

    const { error: eventError } = await supabase.from('activity_events').insert({
      actor_user_id: context.userId,
      couple_id: context.coupleId,
      payload: memory.id,
      type: 'memory_created',
    });

    if (eventError) {
      console.error('Failed to create activity event', eventError);
    }

    revalidateLocalizedPath('/home');
    revalidateLocalizedPath('/on-this-day');
    revalidateLocalizedPath('/lists');

    return createSuccessState('memory.created');
  } catch (error: unknown) {
    console.error('Failed to create memory', error);
    return createErrorState('unexpectedError');
  }
};
