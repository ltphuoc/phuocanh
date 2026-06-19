import type { StoredLocation } from '@/lib/location/types';
import type { CoupleContext } from '@/lib/server/couple-context';
import type { Database } from '@/lib/supabase/database.types';

import { differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCurrentDateTokenInTimeZone,
  parseDateInputValueInTimeZone,
} from '@/lib/utils/couple-timezone';

export interface MemoryCard {
  readonly happenedAt: string;
  readonly id: string;
  readonly location: StoredLocation;
  readonly locationName: string | null;
  readonly mediaType: Database['public']['Enums']['media_type'] | null;
  readonly note: string | null;
  readonly storagePath: string | null;
}

export interface WishItemCard {
  readonly category: Database['public']['Enums']['wish_category'];
  readonly id: string;
  readonly note: string | null;
  readonly title: string;
}

export interface ChecklistItemCard {
  readonly checklistId: string;
  readonly doneAt: string | null;
  readonly id: string;
  readonly isDone: boolean;
  readonly text: string;
}

export interface ChecklistCard {
  readonly id: string;
  readonly items: ChecklistItemCard[];
  readonly title: string;
}

export interface HomePageData {
  readonly checklists: ChecklistCard[];
  readonly memories: MemoryCard[];
  readonly relationshipDays: number;
  readonly wishItems: WishItemCard[];
}

export interface MemoryDetailData {
  readonly happenedAt: string;
  readonly id: string;
  readonly location: StoredLocation;
  readonly locationName: string | null;
  readonly media: {
    readonly id: string;
    readonly mediaType: Database['public']['Enums']['media_type'];
    readonly mimeType: string;
    readonly originalFileName: string | null;
    readonly storagePath: string;
  }[];
  readonly note: string | null;
}

const memoryIdSchema = z.uuid();
type MemoryMediaRow = Database['public']['Tables']['memory_media']['Row'];
type ChecklistItemRow = Database['public']['Tables']['checklist_items']['Row'];

const buildFirstMediaByMemoryId = (
  mediaRows: readonly MemoryMediaRow[],
): Map<string, MemoryMediaRow> => {
  const mediaByMemoryId = new Map<string, MemoryMediaRow>();

  mediaRows.forEach((media) => {
    if (!mediaByMemoryId.has(media.memory_id)) {
      mediaByMemoryId.set(media.memory_id, media);
    }
  });

  return mediaByMemoryId;
};

const toChecklistItemCard = (item: ChecklistItemRow): ChecklistItemCard => ({
  checklistId: item.checklist_id,
  doneAt: item.done_at,
  id: item.id,
  isDone: item.is_done,
  text: item.text,
});

const groupChecklistItemsByChecklistId = (
  checklistItems: readonly ChecklistItemCard[],
): Map<string, ChecklistItemCard[]> => {
  const itemsByChecklistId = new Map<string, ChecklistItemCard[]>();

  checklistItems.forEach((item) => {
    const items = itemsByChecklistId.get(item.checklistId);
    if (items) {
      items.push(item);
      return;
    }

    itemsByChecklistId.set(item.checklistId, [item]);
  });

  return itemsByChecklistId;
};

const toMemoryCard = (
  memory: Database['public']['Tables']['memories']['Row'],
  mediaByMemoryId: ReadonlyMap<string, MemoryMediaRow>,
): MemoryCard => {
  const media = mediaByMemoryId.get(memory.id);
  return {
    happenedAt: memory.happened_at,
    id: memory.id,
    location: {
      address: memory.location_address,
      latitude: memory.location_latitude,
      longitude: memory.location_longitude,
      name: memory.location_name,
      provider: memory.location_provider,
      providerId: memory.location_provider_id,
    },
    locationName: memory.location_name,
    mediaType: media?.media_type ?? null,
    note: memory.note,
    storagePath: media?.storage_path ?? null,
  };
};

export const getHomePageData = async (context: CoupleContext): Promise<HomePageData> => {
  const supabase = await createSupabaseServerClient();

  const [memoryQuery, wishQuery, checklistQuery] = await Promise.all([
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', context.coupleId)
      .order('happened_at', { ascending: false })
      .limit(20),
    supabase
      .from('wish_items')
      .select('*')
      .eq('couple_id', context.coupleId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('checklists')
      .select('*')
      .eq('couple_id', context.coupleId)
      .order('created_at', { ascending: false }),
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

  const [mediaQuery, checklistItemsQuery] = await Promise.all([
    memoryIds.length
      ? supabase.from('memory_media').select('*').in('memory_id', memoryIds)
      : Promise.resolve({ data: [] as MemoryMediaRow[], error: null }),
    checklistIds.length
      ? supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as ChecklistItemRow[], error: null }),
  ]);

  if (mediaQuery.error) {
    throw new Error(mediaQuery.error.message);
  }

  if (checklistItemsQuery.error) {
    throw new Error(checklistItemsQuery.error.message);
  }

  const mediaByMemoryId = buildFirstMediaByMemoryId(mediaQuery.data);
  const itemsByChecklistId = groupChecklistItemsByChecklistId(
    checklistItemsQuery.data.map((item) => toChecklistItemCard(item)),
  );

  const checklists = checklistQuery.data.map((checklist) => ({
    id: checklist.id,
    items: itemsByChecklistId.get(checklist.id) ?? [],
    title: checklist.title,
  }));

  const todayDateToken = getCurrentDateTokenInTimeZone(context.timezone);
  const relationshipDays = differenceInCalendarDays(
    parseDateInputValueInTimeZone(todayDateToken, context.timezone),
    parseDateInputValueInTimeZone(context.coupleStartedAt, context.timezone),
  );

  return {
    checklists,
    memories: memoryQuery.data.map((memory) => toMemoryCard(memory, mediaByMemoryId)),
    relationshipDays,
    wishItems: wishQuery.data.map((item) => ({
      category: item.category,
      id: item.id,
      note: item.note,
      title: item.title,
    })),
  };
};

export interface ListsPageData {
  readonly checklists: ChecklistCard[];
  readonly wishItems: WishItemCard[];
}

export const getListsPageData = async (context: CoupleContext): Promise<ListsPageData> => {
  const supabase = await createSupabaseServerClient();

  const [wishQuery, checklistQuery] = await Promise.all([
    supabase
      .from('wish_items')
      .select('*')
      .eq('couple_id', context.coupleId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('checklists')
      .select('*')
      .eq('couple_id', context.coupleId)
      .order('created_at', { ascending: false }),
  ]);

  if (wishQuery.error) {
    throw new Error(wishQuery.error.message);
  }
  if (checklistQuery.error) {
    throw new Error(checklistQuery.error.message);
  }

  const checklistIds = checklistQuery.data.map((checklist) => checklist.id);
  const checklistItemsQuery = checklistIds.length
    ? await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('created_at', { ascending: true })
    : { data: [], error: null };

  if (checklistItemsQuery.error) {
    throw new Error(checklistItemsQuery.error.message);
  }

  const itemsByChecklistId = groupChecklistItemsByChecklistId(
    checklistItemsQuery.data.map((item) => toChecklistItemCard(item)),
  );

  return {
    checklists: checklistQuery.data.map((checklist) => ({
      id: checklist.id,
      items: itemsByChecklistId.get(checklist.id) ?? [],
      title: checklist.title,
    })),
    wishItems: wishQuery.data.map((item) => ({
      category: item.category,
      id: item.id,
      note: item.note,
      title: item.title,
    })),
  };
};

export const getOnThisDayData = async (context: CoupleContext): Promise<MemoryCard[]> => {
  const supabase = await createSupabaseServerClient();
  const { data: memories, error } = await supabase.rpc('memories_on_this_day', {
    target_couple_id: context.coupleId,
    target_timezone: context.timezone,
  });

  if (error) {
    throw new Error(error.message);
  }

  const matchedMemories = memories ?? [];
  const memoryIds = matchedMemories.map((memory) => memory.id);
  const [mediaQuery, fullMemoryQuery] = await Promise.all([
    memoryIds.length
      ? supabase.from('memory_media').select('*').in('memory_id', memoryIds)
      : Promise.resolve({ data: [] as MemoryMediaRow[], error: null }),
    memoryIds.length
      ? supabase.from('memories').select('*').in('id', memoryIds)
      : Promise.resolve({
          data: [] as Database['public']['Tables']['memories']['Row'][],
          error: null,
        }),
  ]);

  if (mediaQuery.error) {
    throw new Error(mediaQuery.error.message);
  }

  if (fullMemoryQuery.error) {
    throw new Error(fullMemoryQuery.error.message);
  }

  const mediaByMemoryId = buildFirstMediaByMemoryId(mediaQuery.data);
  const fullMemoryById = new Map(fullMemoryQuery.data.map((memory) => [memory.id, memory]));

  return matchedMemories.flatMap((memory) => {
    const fullMemory = fullMemoryById.get(memory.id);
    return fullMemory ? [toMemoryCard(fullMemory, mediaByMemoryId)] : [];
  });
};

export const getMemoryDetailData = async (
  context: CoupleContext,
  memoryId: string,
): Promise<MemoryDetailData | null> => {
  const parsedMemoryId = memoryIdSchema.safeParse(memoryId);
  if (!parsedMemoryId.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .eq('couple_id', context.coupleId)
    .eq('id', parsedMemoryId.data)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const memory = memories[0];
  if (!memory) {
    return null;
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from('memory_media')
    .select('*')
    .eq('memory_id', parsedMemoryId.data)
    .order('created_at', { ascending: true });

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  return {
    happenedAt: memory.happened_at,
    id: memory.id,
    location: {
      address: memory.location_address,
      latitude: memory.location_latitude,
      longitude: memory.location_longitude,
      name: memory.location_name,
      provider: memory.location_provider,
      providerId: memory.location_provider_id,
    },
    locationName: memory.location_name,
    media: mediaRows.map((media) => ({
      id: media.id,
      mediaType: media.media_type,
      mimeType: media.mime_type,
      originalFileName: media.original_file_name,
      storagePath: media.storage_path,
    })),
    note: memory.note,
  };
};
