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

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || null);

const optionalCoordinate = z
  .union([z.literal(''), z.coerce.number().finite()])
  .optional()
  .transform((value) => (typeof value === 'number' ? value : null));

const locationSchema = {
  locationAddress: optionalTrimmedString(280),
  locationLatitude: optionalCoordinate,
  locationLongitude: optionalCoordinate,
  locationName: optionalTrimmedString(180),
  locationProvider: optionalTrimmedString(40),
  locationProviderId: optionalTrimmedString(255),
};

const baseMemorySchema = z.object({
  happenedAt: z.iso.datetime(),
  memoryId: z.uuid(),
  note: optionalTrimmedString(800),
  ...locationSchema,
});

const createMemorySchema = baseMemorySchema;

const updateMemorySchema = baseMemorySchema.extend({
  removedMediaIds: z.array(z.uuid()).default([]),
});

const deleteMemorySchema = z.object({
  confirmation: z.literal('delete'),
  memoryId: z.uuid(),
});

interface UploadedMediaInput {
  readonly mimeType: string;
  readonly originalFileName: string | null;
  readonly sizeBytes: number;
  readonly storagePath: string;
}

const isAllowedMediaMimeType = (mimeType: string): boolean =>
  ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const getOptionalFormDataValue = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
};

const getUploadedMediaInputs = (formData: FormData): UploadedMediaInput[] => {
  const storagePaths = formData.getAll('storagePath').filter((value): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  });
  const mimeTypes = formData.getAll('mimeType').filter((value): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  });
  const originalFileNames = formData
    .getAll('originalFileName')
    .map((value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null));
  const sizeBytes = formData.getAll('sizeBytes').map((value) => Number(value));

  if (
    storagePaths.length !== mimeTypes.length ||
    storagePaths.length !== originalFileNames.length ||
    storagePaths.length !== sizeBytes.length
  ) {
    throw new Error('Invalid media metadata shape.');
  }

  return storagePaths.map((storagePath, index) => ({
    mimeType: mimeTypes[index] ?? '',
    originalFileName: originalFileNames[index] ?? null,
    sizeBytes: sizeBytes[index] ?? Number.NaN,
    storagePath,
  }));
};

const removeUploadedStorageObjects = async (
  supabase: AppSupabaseClient,
  uploadedStoragePaths: readonly string[],
): Promise<string | null> => {
  if (!uploadedStoragePaths.length) {
    return null;
  }

  const { error } = await supabase.storage.from('memory-media').remove([...uploadedStoragePaths]);

  return error ? error.message : null;
};

const isValidMemoryUploadPath = (
  storagePath: string,
  coupleId: string,
  memoryId: string,
): boolean => {
  const match = MEMORY_UPLOAD_PATH_PATTERN.exec(storagePath);
  return match?.[1] === coupleId && match[2] === memoryId;
};

const detectMediaType = (mimeType: string): Database['public']['Enums']['media_type'] => {
  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  return 'image';
};

const validateUploadedMedia = (
  mediaInputs: readonly UploadedMediaInput[],
  coupleId: string,
  memoryId: string,
): ActionState | null => {
  for (const media of mediaInputs) {
    if (
      !Number.isInteger(media.sizeBytes) ||
      media.sizeBytes <= 0 ||
      media.sizeBytes > MAX_UPLOAD_BYTES
    ) {
      return createErrorState('memory.fileTooLarge');
    }

    if (!isAllowedMediaMimeType(media.mimeType)) {
      return createErrorState('memory.unsupportedType');
    }

    if (!isValidMemoryUploadPath(media.storagePath, coupleId, memoryId)) {
      console.error('Memory upload storage path did not match the active memory context', {
        coupleId,
        memoryId,
        storagePath: media.storagePath,
      });
      return createErrorState('unexpectedError');
    }
  }

  return null;
};

const toMediaRows = (
  mediaInputs: readonly UploadedMediaInput[],
  coupleId: string,
  memoryId: string,
): Database['public']['Tables']['memory_media']['Insert'][] =>
  mediaInputs.map((media) => ({
    couple_id: coupleId,
    media_type: detectMediaType(media.mimeType),
    memory_id: memoryId,
    mime_type: media.mimeType,
    original_file_name: media.originalFileName,
    size_bytes: media.sizeBytes,
    storage_path: media.storagePath,
  }));

const deleteEmptyAlbums = async (
  supabase: AppSupabaseClient,
  albumIds: readonly string[],
): Promise<void> => {
  if (!albumIds.length) {
    return;
  }

  const { data: remainingItems, error: remainingItemsError } = await supabase
    .from('album_items')
    .select('album_id')
    .in('album_id', [...albumIds]);

  if (remainingItemsError) {
    console.error('Failed to check album items after media deletion', remainingItemsError);
    return;
  }

  const nonEmptyAlbumIds = new Set(remainingItems.map((item) => item.album_id));
  const emptyAlbumIds = albumIds.filter((albumId) => !nonEmptyAlbumIds.has(albumId));
  if (!emptyAlbumIds.length) {
    return;
  }

  const { error: albumDeleteError } = await supabase
    .from('albums')
    .delete()
    .in('id', emptyAlbumIds);
  if (albumDeleteError) {
    console.error('Failed to delete empty albums after media deletion', albumDeleteError);
  }
};

const getAffectedAlbumIds = async (
  supabase: AppSupabaseClient,
  mediaIds: readonly string[],
): Promise<string[]> => {
  if (!mediaIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('album_items')
    .select('album_id')
    .in('memory_media_id', [...mediaIds]);

  if (error) {
    console.error('Failed to load affected albums for media deletion', error);
    return [];
  }

  return Array.from(new Set(data.map((item) => item.album_id)));
};

const revalidateMemoryPaths = (memoryId?: string): void => {
  revalidateLocalizedPath('/home');
  revalidateLocalizedPath('/on-this-day');
  revalidateLocalizedPath('/lists');
  revalidateLocalizedPath('/albums');
  revalidateLocalizedPath('/map');
  if (memoryId) {
    revalidateLocalizedPath(`/memories/${memoryId}`);
  }
};

export const createMemoryAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const uploadedMedia = getUploadedMediaInputs(formData);
    const context = await requireReadyCoupleContext();
    const parsed = createMemorySchema.parse({
      happenedAt: formData.get('happenedAt'),
      locationAddress: getOptionalFormDataValue(formData, 'locationAddress'),
      locationLatitude: getOptionalFormDataValue(formData, 'locationLatitude'),
      locationLongitude: getOptionalFormDataValue(formData, 'locationLongitude'),
      locationName: getOptionalFormDataValue(formData, 'locationName'),
      locationProvider: getOptionalFormDataValue(formData, 'locationProvider'),
      locationProviderId: getOptionalFormDataValue(formData, 'locationProviderId'),
      memoryId: formData.get('memoryId'),
      note: getOptionalFormDataValue(formData, 'note'),
    });

    const supabase = await createSupabaseServerClient();
    const mediaValidationState = validateUploadedMedia(
      uploadedMedia,
      context.coupleId,
      parsed.memoryId,
    );
    if (mediaValidationState) {
      await removeUploadedStorageObjects(
        supabase,
        uploadedMedia.map((media) => media.storagePath),
      );
      return mediaValidationState;
    }

    if (!uploadedMedia.length && !parsed.note) {
      return createErrorState('memory.missingContent');
    }

    const { data: insertedMemories, error: memoryError } = await supabase
      .from('memories')
      .insert({
        author_user_id: context.userId,
        couple_id: context.coupleId,
        happened_at: parsed.happenedAt,
        id: parsed.memoryId,
        location_address: parsed.locationAddress,
        location_latitude: parsed.locationLatitude,
        location_longitude: parsed.locationLongitude,
        location_name: parsed.locationName,
        location_provider: parsed.locationProvider,
        location_provider_id: parsed.locationProviderId,
        note: parsed.note,
      })
      .select('*')
      .limit(1);

    if (memoryError) {
      const cleanupError = await removeUploadedStorageObjects(
        supabase,
        uploadedMedia.map((media) => media.storagePath),
      );
      if (cleanupError) {
        console.error('Memory upload cleanup failed after memory row error', cleanupError);
      }
      console.error('Failed to create memory row', memoryError);
      return createErrorState('unexpectedError');
    }

    const memory = insertedMemories[0];
    if (!memory) {
      await removeUploadedStorageObjects(
        supabase,
        uploadedMedia.map((media) => media.storagePath),
      );
      return createErrorState('memory.createFailed');
    }

    if (uploadedMedia.length) {
      const { error: mediaError } = await supabase
        .from('memory_media')
        .insert(toMediaRows(uploadedMedia, context.coupleId, memory.id));

      if (mediaError) {
        const cleanupError = await removeUploadedStorageObjects(
          supabase,
          uploadedMedia.map((media) => media.storagePath),
        );
        if (cleanupError) {
          console.error('Media save rollback storage cleanup failed', cleanupError);
        }

        const { error: deleteMemoryError } = await supabase
          .from('memories')
          .delete()
          .eq('id', memory.id);
        if (deleteMemoryError) {
          console.error('Media save rollback memory cleanup failed', deleteMemoryError);
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

    revalidateMemoryPaths(memory.id);
    return createSuccessState('memory.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('memory.invalidSubmission');
    }

    console.error('Failed to create memory', error);
    return createErrorState('unexpectedError');
  }
};

export const updateMemoryAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const uploadedMedia = getUploadedMediaInputs(formData);
    const context = await requireReadyCoupleContext();
    const parsed = updateMemorySchema.parse({
      happenedAt: formData.get('happenedAt'),
      locationAddress: getOptionalFormDataValue(formData, 'locationAddress'),
      locationLatitude: getOptionalFormDataValue(formData, 'locationLatitude'),
      locationLongitude: getOptionalFormDataValue(formData, 'locationLongitude'),
      locationName: getOptionalFormDataValue(formData, 'locationName'),
      locationProvider: getOptionalFormDataValue(formData, 'locationProvider'),
      locationProviderId: getOptionalFormDataValue(formData, 'locationProviderId'),
      memoryId: formData.get('memoryId'),
      note: getOptionalFormDataValue(formData, 'note'),
      removedMediaIds: formData.getAll('removedMediaIds'),
    });

    const supabase = await createSupabaseServerClient();
    const { data: memories, error: memoryLoadError } = await supabase
      .from('memories')
      .select('id')
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.memoryId)
      .limit(1);

    if (memoryLoadError) {
      console.error('Failed to load memory before update', memoryLoadError);
      return createErrorState('unexpectedError');
    }

    if (!memories[0]) {
      return createErrorState('memory.notFound');
    }

    const mediaValidationState = validateUploadedMedia(
      uploadedMedia,
      context.coupleId,
      parsed.memoryId,
    );
    if (mediaValidationState) {
      await removeUploadedStorageObjects(
        supabase,
        uploadedMedia.map((media) => media.storagePath),
      );
      return mediaValidationState;
    }

    const existingMediaQuery = await supabase
      .from('memory_media')
      .select('id, storage_path')
      .eq('memory_id', parsed.memoryId);

    if (existingMediaQuery.error) {
      console.error('Failed to load memory media before update', existingMediaQuery.error);
      return createErrorState('unexpectedError');
    }

    const removedMediaIdSet = new Set(parsed.removedMediaIds);
    const remainingExistingMediaCount = existingMediaQuery.data.filter(
      (media) => !removedMediaIdSet.has(media.id),
    ).length;

    if (!remainingExistingMediaCount && !uploadedMedia.length && !parsed.note) {
      return createErrorState('memory.missingContent');
    }

    const { error: updateError } = await supabase
      .from('memories')
      .update({
        happened_at: parsed.happenedAt,
        location_address: parsed.locationAddress,
        location_latitude: parsed.locationLatitude,
        location_longitude: parsed.locationLongitude,
        location_name: parsed.locationName,
        location_provider: parsed.locationProvider,
        location_provider_id: parsed.locationProviderId,
        note: parsed.note,
      })
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.memoryId);

    if (updateError) {
      console.error('Failed to update memory', updateError);
      return createErrorState('unexpectedError');
    }

    if (parsed.removedMediaIds.length) {
      const mediaToRemove = existingMediaQuery.data.filter((media) =>
        removedMediaIdSet.has(media.id),
      );
      if (!mediaToRemove.length) {
        return createErrorState('memory.invalidSubmission');
      }
      const affectedAlbumIds = await getAffectedAlbumIds(
        supabase,
        mediaToRemove.map((media) => media.id),
      );
      const { error: removeMediaError } = await supabase
        .from('memory_media')
        .delete()
        .in(
          'id',
          mediaToRemove.map((media) => media.id),
        )
        .eq('memory_id', parsed.memoryId);

      if (removeMediaError) {
        console.error('Failed to remove memory media rows', removeMediaError);
        return createErrorState('unexpectedError');
      }

      await deleteEmptyAlbums(supabase, affectedAlbumIds);
      const cleanupError = await removeUploadedStorageObjects(
        supabase,
        mediaToRemove.map((media) => media.storage_path),
      );
      if (cleanupError) {
        console.error('Failed to remove memory media storage objects', cleanupError);
      }
    }

    if (uploadedMedia.length) {
      const { error: mediaError } = await supabase
        .from('memory_media')
        .insert(toMediaRows(uploadedMedia, context.coupleId, parsed.memoryId));

      if (mediaError) {
        await removeUploadedStorageObjects(
          supabase,
          uploadedMedia.map((media) => media.storagePath),
        );
        console.error('Failed to store added memory media metadata', mediaError);
        return createErrorState('unexpectedError');
      }
    }

    revalidateMemoryPaths(parsed.memoryId);
    return createSuccessState('memory.updated');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('memory.invalidSubmission');
    }

    console.error('Failed to update memory', error);
    return createErrorState('unexpectedError');
  }
};

export const deleteMemoryAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = deleteMemorySchema.parse({
      confirmation: formData.get('confirmation'),
      memoryId: formData.get('memoryId'),
    });

    const supabase = await createSupabaseServerClient();
    const { data: mediaRows, error: mediaLoadError } = await supabase
      .from('memory_media')
      .select('id, storage_path')
      .eq('couple_id', context.coupleId)
      .eq('memory_id', parsed.memoryId);

    if (mediaLoadError) {
      console.error('Failed to load memory media before delete', mediaLoadError);
      return createErrorState('unexpectedError');
    }

    const affectedAlbumIds = await getAffectedAlbumIds(
      supabase,
      mediaRows.map((media) => media.id),
    );
    const { error: deleteError } = await supabase
      .from('memories')
      .delete()
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.memoryId);

    if (deleteError) {
      console.error('Failed to delete memory', deleteError);
      return createErrorState('unexpectedError');
    }

    await deleteEmptyAlbums(supabase, affectedAlbumIds);
    const cleanupError = await removeUploadedStorageObjects(
      supabase,
      mediaRows.map((media) => media.storage_path),
    );
    if (cleanupError) {
      console.error('Failed to remove memory storage objects after delete', cleanupError);
    }

    revalidateMemoryPaths(parsed.memoryId);
    return createSuccessState('memory.deleted');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('memory.invalidSubmission');
    }

    console.error('Failed to delete memory', error);
    return createErrorState('unexpectedError');
  }
};
