"use server";

import { z } from "zod";
import {
  createErrorState,
  createSuccessState,
  type ActionState,
} from "@/lib/actions/action-state";
import { revalidateLocalizedPath } from "@/lib/i18n/revalidate";
import { requireReadyCoupleContext } from "@/lib/server/couple-context";
import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  isSupportedCoupleTimeZone,
  toTimeZoneDateStartIso,
} from "@/lib/utils/couple-timezone";

const createCountdownSchema = z.object({
  kind: z.enum(["anniversary", "birthday", "travel", "plan", "custom"]),
  note: z.string().trim().max(280).optional(),
  targetDate: z.iso.date(),
  title: z.string().trim().min(1).max(120),
});

const createFutureNoteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  title: z.string().trim().min(1).max(120),
  unlockDate: z.iso.date(),
});

const createTripSchema = z
  .object({
    endDate: z.iso.date(),
    note: z.string().trim().max(2000).optional(),
    startDate: z.iso.date(),
    title: z.string().trim().min(1).max(120),
  })
  .refine(({ endDate, startDate }) => endDate >= startDate, {
    path: ["endDate"],
    message: "Trip end date must not be before the start date.",
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
  note: z.string().trim().max(800).optional(),
  title: z.string().trim().min(1).max(120),
  tripId: z.uuid(),
  visitedOn: z.iso.date(),
});

const updateCoupleTimezoneSchema = z.object({
  timeZone: z.string().trim().min(1).refine(isSupportedCoupleTimeZone),
});

const ALBUM_MUTATION_ERROR_MESSAGES = new Set([
  "ALBUM_ITEMS_REQUIRED",
  "ALBUM_NOT_FOUND",
  "DUPLICATE_ALBUM_MEDIA",
  "INVALID_ALBUM_MEDIA_SELECTION",
  "TRIP_ALBUM_ALREADY_EXISTS",
  "TRIP_NOT_FOUND",
]);

const INVALID_VISITED_PLACE_ERROR_CODES = new Set(["23503", "23514", "42501"]);
const INVALID_TIMEZONE_RPC_MESSAGES = new Set(["INVALID_TIMEZONE"]);

export const createCountdownAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createCountdownSchema.parse({
      kind: formData.get("kind"),
      note: formData.get("note"),
      targetDate: formData.get("targetDate"),
      title: formData.get("title"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("countdowns").insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      kind: parsed.kind,
      note: parsed.note || null,
      target_at: toTimeZoneDateStartIso(parsed.targetDate, context.timezone),
      title: parsed.title,
    });

    if (error) {
      console.error("Failed to create countdown", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/countdowns");
    return createSuccessState("countdown.created");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("countdown.invalidSubmission");
    }

    console.error("Failed to create countdown", error);
    return createErrorState("unexpectedError");
  }
};

export const createFutureNoteAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createFutureNoteSchema.parse({
      body: formData.get("body"),
      title: formData.get("title"),
      unlockDate: formData.get("unlockDate"),
    });

    const supabase = await createSupabaseServerClient();
    const { data: insertedFutureNotes, error: futureNoteError } = await supabase
      .from("future_notes")
      .insert({
        couple_id: context.coupleId,
        created_by_user_id: context.userId,
        title: parsed.title,
        unlock_at: toTimeZoneDateStartIso(parsed.unlockDate, context.timezone),
      })
      .select("id")
      .limit(1);

    if (futureNoteError) {
      console.error("Failed to create future note metadata", futureNoteError);
      return createErrorState("unexpectedError");
    }

    const futureNote = insertedFutureNotes[0];
    if (!futureNote) {
      return createErrorState("unexpectedError");
    }

    const { error: contentError } = await supabase.from("future_note_contents").insert({
      body: parsed.body,
      future_note_id: futureNote.id,
    });

    if (contentError) {
      const { error: rollbackError } = await supabase
        .from("future_notes")
        .delete()
        .eq("id", futureNote.id);
      if (rollbackError) {
        console.error("Future note rollback failed", rollbackError);
      }

      console.error("Failed to create future note content", contentError);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/future-notes");
    return createSuccessState("futureNote.created");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("futureNote.invalidSubmission");
    }

    console.error("Failed to create future note", error);
    return createErrorState("unexpectedError");
  }
};

export const createTripAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createTripSchema.parse({
      endDate: formData.get("endDate"),
      note: formData.get("note"),
      startDate: formData.get("startDate"),
      title: formData.get("title"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("trips").insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      end_date: parsed.endDate,
      note: parsed.note || null,
      start_date: parsed.startDate,
      title: parsed.title,
    });

    if (error) {
      console.error("Failed to create trip", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/trips");
    return createSuccessState("trip.created");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("trip.invalidSubmission");
    }

    console.error("Failed to create trip", error);
    return createErrorState("unexpectedError");
  }
};

export const createAlbumAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = createAlbumSchema.parse({
      description: formData.get("description"),
      memoryMediaIds: formData.getAll("memoryMediaIds"),
      title: formData.get("title"),
      tripId: formData.get("tripId"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("create_album_with_items", {
      album_description: parsed.description || "",
      album_title: parsed.title,
      selected_memory_media_ids: parsed.memoryMediaIds,
      target_trip_id: parsed.tripId,
    });

    if (error) {
      if (ALBUM_MUTATION_ERROR_MESSAGES.has(error.message)) {
        return createErrorState("album.invalidSubmission");
      }

      console.error("Failed to create album", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/albums");
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState("album.created");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("album.invalidSubmission");
    }

    console.error("Failed to create album", error);
    return createErrorState("unexpectedError");
  }
};

export const addAlbumItemsAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    await requireReadyCoupleContext();
    const parsed = addAlbumItemsSchema.parse({
      albumId: formData.get("albumId"),
      memoryMediaIds: formData.getAll("memoryMediaIds"),
      tripId: formData.get("tripId"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("add_album_items", {
      selected_memory_media_ids: parsed.memoryMediaIds,
      target_album_id: parsed.albumId,
    });

    if (error) {
      if (ALBUM_MUTATION_ERROR_MESSAGES.has(error.message)) {
        return createErrorState("album.invalidSubmission");
      }

      console.error("Failed to add album items", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/albums");
    revalidateLocalizedPath(`/albums/${parsed.albumId}`);
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState("album.updated");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("album.invalidSubmission");
    }

    console.error("Failed to add album items", error);
    return createErrorState("unexpectedError");
  }
};

export const createVisitedPlaceAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createVisitedPlaceSchema.parse({
      note: formData.get("note"),
      title: formData.get("title"),
      tripId: formData.get("tripId"),
      visitedOn: formData.get("visitedOn"),
    });

    const supabase = await createSupabaseServerClient();
    const { data: trips, error: tripError } = await supabase
      .from("trips")
      .select("id, start_date, end_date")
      .eq("couple_id", context.coupleId)
      .eq("id", parsed.tripId)
      .limit(1);

    if (tripError) {
      console.error("Failed to validate visited place trip", tripError);
      return createErrorState("unexpectedError");
    }

    const trip = trips[0];
    if (!trip) {
      return createErrorState("visitedPlace.invalidSubmission");
    }

    if (parsed.visitedOn < trip.start_date || parsed.visitedOn > trip.end_date) {
      return createErrorState("visitedPlace.invalidSubmission");
    }

    const { error } = await supabase.from("visited_places").insert({
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      note: parsed.note || null,
      title: parsed.title,
      trip_id: parsed.tripId,
      visited_on: parsed.visitedOn,
    });

    if (error) {
      if (error.code && INVALID_VISITED_PLACE_ERROR_CODES.has(error.code)) {
        return createErrorState("visitedPlace.invalidSubmission");
      }

      console.error("Failed to create visited place", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/map");
    revalidateLocalizedPath(`/trips/${parsed.tripId}`);
    return createSuccessState("visitedPlace.created");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("visitedPlace.invalidSubmission");
    }

    console.error("Failed to create visited place", error);
    return createErrorState("unexpectedError");
  }
};

export const updateCoupleTimezoneAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = updateCoupleTimezoneSchema.parse({
      timeZone: formData.get("timeZone"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("update_couple_timezone", {
      target_couple_id: context.coupleId,
      target_timezone: parsed.timeZone,
    });

    if (error) {
      if (INVALID_TIMEZONE_RPC_MESSAGES.has(error.message)) {
        return createErrorState("settings.timezone.invalidSubmission");
      }

      console.error("Failed to update couple timezone", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/settings");
    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/on-this-day");
    revalidateLocalizedPath("/countdowns");
    revalidateLocalizedPath("/future-notes");
    revalidateLocalizedPath("/trips");
    revalidateLocalizedPath("/albums");
    revalidateLocalizedPath("/map");

    return createSuccessState("settings.timezone.updated");
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createErrorState("settings.timezone.invalidSubmission");
    }

    console.error("Failed to update couple timezone", error);
    return createErrorState("unexpectedError");
  }
};
