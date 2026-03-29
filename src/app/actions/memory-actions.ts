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
  type AppSupabaseClient,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const createMemorySchema = z.object({
  happenedAt: z.iso.datetime(),
  locationName: z.string().max(180).optional(),
  note: z.string().max(800).optional(),
});

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_MIME_PREFIXES = ["image/", "video/"] as const;

const sanitizeFileName = (fileName: string): string =>
  fileName.replaceAll(/[^a-zA-Z0-9.\-_]/g, "_");

const isAllowedMediaMimeType = (mimeType: string): boolean =>
  ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

const detectMediaType = (mimeType: string): Database["public"]["Enums"]["media_type"] => {
  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "image";
};

const rollbackMemoryMutation = async (
  supabase: AppSupabaseClient,
  memoryId: string,
  uploadedStoragePath: string | null,
): Promise<string | null> => {
  const cleanupErrors: string[] = [];

  if (uploadedStoragePath) {
    const { error: removeObjectError } = await supabase.storage
      .from("memory-media")
      .remove([uploadedStoragePath]);
    if (removeObjectError) {
      cleanupErrors.push(removeObjectError.message);
    }
  }

  const { error: deleteMemoryError } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId);

  if (deleteMemoryError) {
    cleanupErrors.push(deleteMemoryError.message);
  }

  if (!cleanupErrors.length) {
    return null;
  }

  return cleanupErrors.join("; ");
};

export const createMemoryAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = createMemorySchema.parse({
      happenedAt: formData.get("happenedAt"),
      locationName: formData.get("locationName"),
      note: formData.get("note"),
    });

    const supabase = await createSupabaseServerClient();
    const trimmedNote = parsed.note?.trim() ?? "";
    const fileInput = formData.get("media");
    const mediaFile = fileInput instanceof File && fileInput.size > 0 ? fileInput : null;
    const hasFile = mediaFile !== null;

    if (!hasFile && !trimmedNote) {
      return createErrorState("memory.missingContent");
    }

    if (mediaFile && mediaFile.size > MAX_UPLOAD_BYTES) {
      return createErrorState("memory.fileTooLarge");
    }

    if (mediaFile && !isAllowedMediaMimeType(mediaFile.type)) {
      return createErrorState("memory.unsupportedType");
    }

    const { data: insertedMemories, error: memoryError } = await supabase
      .from("memories")
      .insert({
        author_user_id: context.userId,
        couple_id: context.coupleId,
        happened_at: parsed.happenedAt,
        location_name: parsed.locationName?.trim() || null,
        note: trimmedNote || null,
      })
      .select("*")
      .limit(1);

    if (memoryError) {
      console.error("Failed to create memory row", memoryError);
      return createErrorState("unexpectedError");
    }

    const memory = insertedMemories[0];
    if (!memory) {
      return createErrorState("memory.createFailed");
    }

    if (mediaFile) {
      const safeName = sanitizeFileName(mediaFile.name || "upload");
      const storagePath = `couples/${context.coupleId}/memories/${memory.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("memory-media")
        .upload(storagePath, mediaFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        const cleanupError = await rollbackMemoryMutation(supabase, memory.id, null);
        if (cleanupError) {
          console.error("Upload rollback failed", cleanupError);
        }

        console.error("Failed to upload media", uploadError);
        return createErrorState("unexpectedError");
      }

      const { error: mediaError } = await supabase.from("memory_media").insert({
        couple_id: context.coupleId,
        media_type: detectMediaType(mediaFile.type),
        memory_id: memory.id,
        mime_type: mediaFile.type,
        original_file_name: mediaFile.name || null,
        size_bytes: mediaFile.size,
        storage_path: storagePath,
      });

      if (mediaError) {
        const cleanupError = await rollbackMemoryMutation(supabase, memory.id, storagePath);
        if (cleanupError) {
          console.error("Media save rollback failed", cleanupError);
        }

        console.error("Failed to store media metadata", mediaError);
        return createErrorState("unexpectedError");
      }
    }

    const { error: eventError } = await supabase.from("activity_events").insert({
      actor_user_id: context.userId,
      couple_id: context.coupleId,
      payload: memory.id,
      type: "memory_created",
    });

    if (eventError) {
      console.error("Failed to create activity event", eventError);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/on-this-day");
    revalidateLocalizedPath("/lists");

    return createSuccessState("memory.created");
  } catch (error: unknown) {
    console.error("Failed to create memory", error);
    return createErrorState("unexpectedError");
  }
};
