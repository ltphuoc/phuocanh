import { differenceInCalendarDays } from "date-fns";
import type { CoupleContext } from "@/lib/server/couple-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  getCurrentDateTokenInTimeZone,
  parseDateInputValueInTimeZone,
} from "@/lib/utils/couple-timezone";

interface MemoryCard {
  readonly happenedAt: string;
  readonly id: string;
  readonly locationName: string | null;
  readonly mediaType: Database["public"]["Enums"]["media_type"] | null;
  readonly note: string | null;
  readonly storagePath: string | null;
}

interface WishItemCard {
  readonly category: Database["public"]["Enums"]["wish_category"];
  readonly id: string;
  readonly note: string | null;
  readonly title: string;
}

interface ChecklistItemCard {
  readonly checklistId: string;
  readonly doneAt: string | null;
  readonly id: string;
  readonly isDone: boolean;
  readonly text: string;
}

interface ChecklistCard {
  readonly id: string;
  readonly items: ChecklistItemCard[];
  readonly title: string;
}

interface HomePageData {
  readonly checklists: ChecklistCard[];
  readonly memories: MemoryCard[];
  readonly relationshipDays: number;
  readonly wishItems: WishItemCard[];
}

interface MemoryDetailData {
  readonly happenedAt: string;
  readonly id: string;
  readonly locationName: string | null;
  readonly media: {
    readonly id: string;
    readonly mediaType: Database["public"]["Enums"]["media_type"];
    readonly mimeType: string;
    readonly storagePath: string;
  }[];
  readonly note: string | null;
}

const toMemoryCard = (
  memory: Database["public"]["Tables"]["memories"]["Row"],
  mediaRows: Database["public"]["Tables"]["memory_media"]["Row"][],
): MemoryCard => {
  const media = mediaRows.find((item) => item.memory_id === memory.id);
  return {
    happenedAt: memory.happened_at,
    id: memory.id,
    locationName: memory.location_name,
    mediaType: media?.media_type ?? null,
    note: memory.note,
    storagePath: media?.storage_path ?? null,
  };
};

export const getHomePageData = async (
  context: CoupleContext,
): Promise<HomePageData> => {
  const supabase = await createSupabaseServerClient();

  const [memoryQuery, wishQuery, checklistQuery] = await Promise.all([
    supabase
      .from("memories")
      .select("*")
      .eq("couple_id", context.coupleId)
      .order("happened_at", { ascending: false })
      .limit(20),
    supabase
      .from("wish_items")
      .select("*")
      .eq("couple_id", context.coupleId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("checklists")
      .select("*")
      .eq("couple_id", context.coupleId)
      .order("created_at", { ascending: false }),
  ]);

  if (memoryQuery.error) {
    throw new Error(memoryQuery.error.message);
  }
  if (wishQuery.error) {
    throw new Error(wishQuery.error.message);
  }
  if (checklistQuery.error) {
    throw new Error(checklistQuery.error.message);
  }

  const memoryIds = memoryQuery.data.map((memory) => memory.id);
  const checklistIds = checklistQuery.data.map((checklist) => checklist.id);

  const mediaQuery = memoryIds.length
    ? await supabase.from("memory_media").select("*").in("memory_id", memoryIds)
    : { data: [], error: null };

  if (mediaQuery.error) {
    throw new Error(mediaQuery.error.message);
  }

  const checklistItemsQuery = checklistIds.length
    ? await supabase
        .from("checklist_items")
        .select("*")
        .in("checklist_id", checklistIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (checklistItemsQuery.error) {
    throw new Error(checklistItemsQuery.error.message);
  }

  const checklistItems = checklistItemsQuery.data.map((item) => ({
    checklistId: item.checklist_id,
    doneAt: item.done_at,
    id: item.id,
    isDone: item.is_done,
    text: item.text,
  }));

  const checklists = checklistQuery.data.map((checklist) => ({
    id: checklist.id,
    items: checklistItems.filter((item) => item.checklistId === checklist.id),
    title: checklist.title,
  }));

  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const relationshipDays = differenceInCalendarDays(
    parseDateInputValueInTimeZone(todayDateToken, context.timezone),
    parseDateInputValueInTimeZone(context.coupleStartedAt, context.timezone),
  );

  return {
    checklists,
    memories: memoryQuery.data.map((memory) => toMemoryCard(memory, mediaQuery.data)),
    relationshipDays,
    wishItems: wishQuery.data.map((item) => ({
      category: item.category,
      id: item.id,
      note: item.note,
      title: item.title,
    })),
  };
};

export const getOnThisDayData = async (
  context: CoupleContext,
): Promise<MemoryCard[]> => {
  const supabase = await createSupabaseServerClient();
  const { data: memories, error } = await supabase.rpc("memories_on_this_day", {
    target_couple_id: context.coupleId,
    target_timezone: context.timezone,
  });

  if (error) {
    throw new Error(error.message);
  }

  const matchedMemories = memories ?? [];
  const memoryIds = matchedMemories.map((memory) => memory.id);
  const mediaQuery = memoryIds.length
    ? await supabase.from("memory_media").select("*").in("memory_id", memoryIds)
    : { data: [], error: null };

  if (mediaQuery.error) {
    throw new Error(mediaQuery.error.message);
  }

  return matchedMemories.map((memory) => toMemoryCard(memory, mediaQuery.data));
};

export const getMemoryDetailData = async (
  context: CoupleContext,
  memoryId: string,
): Promise<MemoryDetailData | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: memories, error } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", context.coupleId)
    .eq("id", memoryId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const memory = memories[0];
  if (!memory) {
    return null;
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("memory_media")
    .select("*")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  return {
    happenedAt: memory.happened_at,
    id: memory.id,
    locationName: memory.location_name,
    media: mediaRows.map((media) => ({
      id: media.id,
      mediaType: media.media_type,
      mimeType: media.mime_type,
      storagePath: media.storage_path,
    })),
    note: memory.note,
  };
};
