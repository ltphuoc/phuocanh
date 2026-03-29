"use server";

import { z } from "zod";
import {
  createErrorState,
  createSuccessState,
  type ActionState,
} from "@/lib/actions/action-state";
import { revalidateLocalizedPath } from "@/lib/i18n/revalidate";
import { requireReadyCoupleContext } from "@/lib/server/couple-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const wishItemSchema = z.object({
  category: z.enum(["place", "food", "movie"]),
  note: z.string().max(200).optional(),
  title: z.string().min(1).max(120),
});

const checklistSchema = z.object({
  title: z.string().min(1).max(120),
});

const checklistItemSchema = z.object({
  checklistId: z.uuid(),
  text: z.string().min(1).max(180),
});

const checklistToggleSchema = z.object({
  checklistItemId: z.uuid(),
  nextDone: z.enum(["true", "false"]),
});

export const addWishItemAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = wishItemSchema.parse({
      category: formData.get("category"),
      note: formData.get("note"),
      title: formData.get("title"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("wish_items").insert({
      category: parsed.category,
      couple_id: context.coupleId,
      created_by_user_id: context.userId,
      note: parsed.note?.trim() || null,
      status: "pending",
      title: parsed.title.trim(),
    });

    if (error) {
      console.error("Failed to add wish item", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/lists");
    return createSuccessState("list.wishItem.added");
  } catch (error: unknown) {
    console.error("Failed to add wish item", error);
    return createErrorState("unexpectedError");
  }
};

export const createChecklistAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const context = await requireReadyCoupleContext();
    const parsed = checklistSchema.parse({
      title: formData.get("title"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("checklists").insert({
      couple_id: context.coupleId,
      title: parsed.title.trim(),
    });

    if (error) {
      console.error("Failed to create checklist", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/lists");
    return createSuccessState("list.checklist.created");
  } catch (error: unknown) {
    console.error("Failed to create checklist", error);
    return createErrorState("unexpectedError");
  }
};

export const addChecklistItemAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = checklistItemSchema.parse({
      checklistId: formData.get("checklistId"),
      text: formData.get("text"),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("checklist_items").insert({
      checklist_id: parsed.checklistId,
      is_done: false,
      text: parsed.text.trim(),
    });

    if (error) {
      console.error("Failed to add checklist item", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/lists");
    return createSuccessState("list.checklistItem.added");
  } catch (error: unknown) {
    console.error("Failed to add checklist item", error);
    return createErrorState("unexpectedError");
  }
};

export const toggleChecklistItemAction = async (
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  try {
    const parsed = checklistToggleSchema.parse({
      checklistItemId: formData.get("checklistItemId"),
      nextDone: formData.get("nextDone"),
    });

    const nextDone = parsed.nextDone === "true";
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("checklist_items")
      .update({
        done_at: nextDone ? new Date().toISOString() : null,
        is_done: nextDone,
      })
      .eq("id", parsed.checklistItemId);

    if (error) {
      console.error("Failed to toggle checklist item", error);
      return createErrorState("unexpectedError");
    }

    revalidateLocalizedPath("/home");
    revalidateLocalizedPath("/lists");
    return createSuccessState("list.checklist.updated");
  } catch (error: unknown) {
    console.error("Failed to toggle checklist item", error);
    return createErrorState("unexpectedError");
  }
};
