'use server';

import type { ActionState } from '@/lib/actions/action-state';

import { z } from 'zod';

import { createErrorState, createSuccessState } from '@/lib/actions/action-state';
import { revalidateLocalizedPath } from '@/lib/i18n/revalidate';
import { requireReadyCoupleContext } from '@/lib/server/couple-context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupportedCoupleTimeZone, toTimeZoneDateStartIso } from '@/lib/utils/couple-timezone';

const createCountdownSchema = z.object({
  kind: z.enum(['anniversary', 'birthday', 'travel', 'plan', 'custom']),
  note: z.string().trim().max(280).optional(),
  targetDate: z.iso.date(),
  title: z.string().trim().min(1).max(120),
});

const createFutureNoteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  title: z.string().trim().min(1).max(120),
  unlockDate: z.iso.date(),
});

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

const createTripSchema = z
  .object({
    endDate: z.iso.date(),
    note: optionalTrimmedString(2000),
    startDate: z.iso.date(),
    title: z.string().trim().min(1).max(120),
    ...locationSchema,
  })
  .refine(({ endDate, startDate }) => endDate >= startDate, {
    path: ['endDate'],
    message: 'Trip end date must not be before the start date.',
  });

const updateTripSchema = createTripSchema.extend({
  tripId: z.uuid(),
});

const deleteTripSchema = z.object({
  confirmation: z.literal('delete'),
  tripId: z.uuid(),
});

const createAlbumSchema = z.object({
  description: z.string().trim().max(800).optional(),
  memoryMediaIds: z.array(z.uuid()).min(1),
  title: z.string().trim().min(1).max(120),
  tripId: z.uuid(),
});

const addAlbumItemsSchema = z.object({
  albumId: z.uuid(),
  memoryMediaIds: z.array(z.uuid()).min(1),
  tripId: z.uuid(),
});

const createVisitedPlaceSchema = z.object({
  note: optionalTrimmedString(800),
  title: z.string().trim().min(1).max(120),
  tripId: z.uuid(),
  visitedOn: z.iso.date(),
  locationAddress: optionalTrimmedString(280),
  locationLatitude: optionalCoordinate,
  locationLongitude: optionalCoordinate,
  locationProvider: optionalTrimmedString(40),
  locationProviderId: optionalTrimmedString(255),
});

const updateCoupleTimezoneSchema = z.object({
  timeZone: z.string().trim().min(1).refine(isSupportedCoupleTimeZone),
});

const ALBUM_MUTATION_ERROR_MESSAGES = new Set([
  'ALBUM_ITEMS_REQUIRED',
  'ALBUM_NOT_FOUND',
  'DUPLICATE_ALBUM_MEDIA',
  'INVALID_ALBUM_MEDIA_SELECTION',
  'TRIP_ALBUM_ALREADY_EXISTS',
  'TRIP_NOT_FOUND',
]);

const INVALID_FUTURE_NOTE_RPC_MESSAGES = new Set([
  'INVALID_FUTURE_NOTE_BODY',
  'INVALID_FUTURE_NOTE_TITLE',
  'INVALID_FUTURE_NOTE_UNLOCK_AT',
]);
const INVALID_VISITED_PLACE_ERROR_CODES = new Set(['23503', '23514', '42501']);
const INVALID_TIMEZONE_RPC_MESSAGES = new Set(['INVALID_TIMEZONE']);

const getOptionalFormDataValue = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
};

const revalidateTripPaths = (tripId?: string): void => {
  revalidateLocalizedPath('/trips');
  revalidateLocalizedPath('/albums');
  revalidateLocalizedPath('/map');
  if (tripId) {
    revalidateLocalizedPath(`/trips/${tripId}`);
  }
};

export const createCountdownAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createCountdownSchema.parse({
      kind: formData.get('kind'),
      note: formData.get('note'),
      targetDate: formData.get('targetDate'),
      title: formData.get('title'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('countdowns').insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      kind: parsed.kind,
      note: parsed.note || null,
      target_at: toTimeZoneDateStartIso(parsed.targetDate, context.timezone),
      title: parsed.title,
    });

    if (error) {
      console.error('Failed to create countdown', error);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/countdowns');
    return createSuccessState('countdown.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('countdown.invalidSubmission');
    }

    console.error('Failed to create countdown', error);
    return createErrorState('unexpectedError');
  }
};

export const createFutureNoteAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createFutureNoteSchema.parse({
      body: formData.get('body'),
      title: formData.get('title'),
      unlockDate: formData.get('unlockDate'),
    });

    const supabase = await createSupabaseServerClient();
    const { data: createdFutureNoteId, error: futureNoteError } = await supabase.rpc(
      'create_future_note_with_body',
      {
        note_body: parsed.body,
        note_title: parsed.title,
        note_unlock_at: toTimeZoneDateStartIso(parsed.unlockDate, context.timezone),
      },
    );

    if (futureNoteError) {
      if (INVALID_FUTURE_NOTE_RPC_MESSAGES.has(futureNoteError.message)) {
        return createErrorState('futureNote.invalidSubmission');
      }

      console.error('Failed to create future note', futureNoteError);
      return createErrorState('unexpectedError');
    }

    if (!createdFutureNoteId) {
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/future-notes');
    return createSuccessState('futureNote.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('futureNote.invalidSubmission');
    }

    console.error('Failed to create future note', error);
    return createErrorState('unexpectedError');
  }
};

export const createTripAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createTripSchema.parse({
      endDate: formData.get('endDate'),
      locationAddress: getOptionalFormDataValue(formData, 'locationAddress'),
      locationLatitude: getOptionalFormDataValue(formData, 'locationLatitude'),
      locationLongitude: getOptionalFormDataValue(formData, 'locationLongitude'),
      locationName: getOptionalFormDataValue(formData, 'locationName'),
      locationProvider: getOptionalFormDataValue(formData, 'locationProvider'),
      locationProviderId: getOptionalFormDataValue(formData, 'locationProviderId'),
      note: getOptionalFormDataValue(formData, 'note'),
      startDate: formData.get('startDate'),
      title: formData.get('title'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('trips').insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      end_date: parsed.endDate,
      location_address: parsed.locationAddress,
      location_latitude: parsed.locationLatitude,
      location_longitude: parsed.locationLongitude,
      location_name: parsed.locationName,
      location_provider: parsed.locationProvider,
      location_provider_id: parsed.locationProviderId,
      note: parsed.note,
      start_date: parsed.startDate,
      title: parsed.title,
    });

    if (error) {
      console.error('Failed to create trip', error);
      return createErrorState('unexpectedError');
    }

    revalidateTripPaths();
    return createSuccessState('trip.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('trip.invalidSubmission');
    }

    console.error('Failed to create trip', error);
    return createErrorState('unexpectedError');
  }
};

export const updateTripAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = updateTripSchema.parse({
      endDate: formData.get('endDate'),
      locationAddress: getOptionalFormDataValue(formData, 'locationAddress'),
      locationLatitude: getOptionalFormDataValue(formData, 'locationLatitude'),
      locationLongitude: getOptionalFormDataValue(formData, 'locationLongitude'),
      locationName: getOptionalFormDataValue(formData, 'locationName'),
      locationProvider: getOptionalFormDataValue(formData, 'locationProvider'),
      locationProviderId: getOptionalFormDataValue(formData, 'locationProviderId'),
      note: getOptionalFormDataValue(formData, 'note'),
      startDate: formData.get('startDate'),
      title: formData.get('title'),
      tripId: formData.get('tripId'),
    });

    const supabase = await createSupabaseServerClient();
    const { data: outsidePlaces, error: outsidePlacesError } = await supabase
      .from('visited_places')
      .select('id')
      .eq('couple_id', context.coupleId)
      .eq('trip_id', parsed.tripId)
      .or(`visited_on.lt.${parsed.startDate},visited_on.gt.${parsed.endDate}`)
      .limit(1);

    if (outsidePlacesError) {
      console.error('Failed to validate trip stops before update', outsidePlacesError);
      return createErrorState('unexpectedError');
    }

    if (outsidePlaces.length) {
      return createErrorState('trip.invalidDateRangeWithStops');
    }

    // Block a narrowing edit that would strand album photos whose memory date now
    // falls outside the new window. Mirrors the visited-places guard above; the RPC
    // reuses add_album_items' couple-timezone eligibility predicate.
    const { data: orphanedAlbumItemCount, error: orphanedAlbumItemError } = await supabase.rpc(
      'count_album_items_outside_trip_window',
      {
        p_end_date: parsed.endDate,
        p_start_date: parsed.startDate,
        p_trip_id: parsed.tripId,
      },
    );

    if (orphanedAlbumItemError) {
      console.error('Failed to validate trip album media before update', orphanedAlbumItemError);
      return createErrorState('unexpectedError');
    }

    if ((orphanedAlbumItemCount ?? 0) > 0) {
      return createErrorState('trip.invalidDateRangeWithAlbumMedia');
    }

    const { error } = await supabase
      .from('trips')
      .update({
        end_date: parsed.endDate,
        location_address: parsed.locationAddress,
        location_latitude: parsed.locationLatitude,
        location_longitude: parsed.locationLongitude,
        location_name: parsed.locationName,
        location_provider: parsed.locationProvider,
        location_provider_id: parsed.locationProviderId,
        note: parsed.note,
        start_date: parsed.startDate,
        title: parsed.title,
      })
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.tripId);

    if (error) {
      console.error('Failed to update trip', error);
      return createErrorState('unexpectedError');
    }

    revalidateTripPaths(parsed.tripId);
    return createSuccessState('trip.updated');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('trip.invalidSubmission');
    }

    console.error('Failed to update trip', error);
    return createErrorState('unexpectedError');
  }
};

export const deleteTripAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = deleteTripSchema.parse({
      confirmation: formData.get('confirmation'),
      tripId: formData.get('tripId'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.tripId);

    if (error) {
      console.error('Failed to delete trip', error);
      return createErrorState('unexpectedError');
    }

    revalidateTripPaths(parsed.tripId);
    return createSuccessState('trip.deleted');
  } catch (error: unknown) {
    console.error('Failed to delete trip', error);
    return createErrorState('unexpectedError');
  }
};

export const createAlbumAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = createAlbumSchema.parse({
      description: formData.get('description'),
      memoryMediaIds: formData.getAll('memoryMediaIds'),
      title: formData.get('title'),
      tripId: formData.get('tripId'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('create_album_with_items', {
      album_description: parsed.description || '',
      album_title: parsed.title,
      selected_memory_media_ids: parsed.memoryMediaIds,
      target_trip_id: parsed.tripId,
    });

    if (error) {
      if (ALBUM_MUTATION_ERROR_MESSAGES.has(error.message)) {
        return createErrorState('album.invalidSubmission');
      }

      console.error('Failed to create album', error);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/albums');
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState('album.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('album.invalidSubmission');
    }

    console.error('Failed to create album', error);
    return createErrorState('unexpectedError');
  }
};

export const addAlbumItemsAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = addAlbumItemsSchema.parse({
      albumId: formData.get('albumId'),
      memoryMediaIds: formData.getAll('memoryMediaIds'),
      tripId: formData.get('tripId'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('add_album_items', {
      selected_memory_media_ids: parsed.memoryMediaIds,
      target_album_id: parsed.albumId,
    });

    if (error) {
      if (ALBUM_MUTATION_ERROR_MESSAGES.has(error.message)) {
        return createErrorState('album.invalidSubmission');
      }

      console.error('Failed to add album items', error);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/albums');
    revalidateLocalizedPath(`/albums/${parsed.albumId}`);
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState('album.updated');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('album.invalidSubmission');
    }

    console.error('Failed to add album items', error);
    return createErrorState('unexpectedError');
  }
};

export const createVisitedPlaceAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createVisitedPlaceSchema.parse({
      locationAddress: getOptionalFormDataValue(formData, 'locationAddress'),
      locationLatitude: getOptionalFormDataValue(formData, 'locationLatitude'),
      locationLongitude: getOptionalFormDataValue(formData, 'locationLongitude'),
      locationProvider: getOptionalFormDataValue(formData, 'locationProvider'),
      locationProviderId: getOptionalFormDataValue(formData, 'locationProviderId'),
      note: getOptionalFormDataValue(formData, 'note'),
      title: formData.get('title'),
      tripId: formData.get('tripId'),
      visitedOn: formData.get('visitedOn'),
    });

    const supabase = await createSupabaseServerClient();
    const { data: trips, error: tripError } = await supabase
      .from('trips')
      .select('id, start_date, end_date')
      .eq('couple_id', context.coupleId)
      .eq('id', parsed.tripId)
      .limit(1);

    if (tripError) {
      console.error('Failed to validate visited place trip', tripError);
      return createErrorState('unexpectedError');
    }

    const trip = trips[0];
    if (!trip) {
      return createErrorState('visitedPlace.invalidSubmission');
    }

    if (parsed.visitedOn < trip.start_date || parsed.visitedOn > trip.end_date) {
      return createErrorState('visitedPlace.invalidSubmission');
    }

    const { error } = await supabase.from('visited_places').insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      location_address: parsed.locationAddress,
      location_latitude: parsed.locationLatitude,
      location_longitude: parsed.locationLongitude,
      location_provider: parsed.locationProvider,
      location_provider_id: parsed.locationProviderId,
      note: parsed.note,
      title: parsed.title,
      trip_id: parsed.tripId,
      visited_on: parsed.visitedOn,
    });

    if (error) {
      if (error.code && INVALID_VISITED_PLACE_ERROR_CODES.has(error.code)) {
        return createErrorState('visitedPlace.invalidSubmission');
      }

      console.error('Failed to create visited place', error);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/map');
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState('visitedPlace.created');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('visitedPlace.invalidSubmission');
    }

    console.error('Failed to create visited place', error);
    return createErrorState('unexpectedError');
  }
};

export const updateCoupleTimezoneAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = updateCoupleTimezoneSchema.parse({
      timeZone: formData.get('timeZone'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('update_couple_timezone', {
      target_couple_id: context.coupleId,
      target_timezone: parsed.timeZone,
    });

    if (error) {
      if (INVALID_TIMEZONE_RPC_MESSAGES.has(error.message)) {
        return createErrorState('settings.timezone.invalidSubmission');
      }

      console.error('Failed to update couple timezone', error);
      return createErrorState('unexpectedError');
    }

    revalidateLocalizedPath('/settings');
    revalidateLocalizedPath('/home');
    revalidateLocalizedPath('/on-this-day');
    revalidateLocalizedPath('/countdowns');
    revalidateLocalizedPath('/future-notes');
    revalidateLocalizedPath('/trips');
    revalidateLocalizedPath('/albums');
    revalidateLocalizedPath('/map');

    return createSuccessState('settings.timezone.updated');
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState('settings.timezone.invalidSubmission');
    }

    console.error('Failed to update couple timezone', error);
    return createErrorState('unexpectedError');
  }
};
