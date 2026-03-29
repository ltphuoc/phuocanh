import type { Simplify } from "type-fest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CamelStoragePathItem {
  readonly storagePath: string | null;
}

interface SnakeStoragePathItem {
  readonly storage_path: string | null;
}

type StoragePathItem = CamelStoragePathItem | SnakeStoragePathItem;

export type SignedStoragePathItem<TItem extends StoragePathItem> = Simplify<
  TItem & {
    readonly signedUrl: string | null;
  }
>;

const MEMORY_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 15;

const getStoragePath = (item: StoragePathItem): string | null =>
  "storagePath" in item ? item.storagePath : item.storage_path;

export const signMemoryMediaStorageItems = async <TItem extends StoragePathItem>(
  items: readonly TItem[],
): Promise<readonly SignedStoragePathItem<TItem>[]> => {
  const supabase = await createSupabaseServerClient();

  const signedItems = await Promise.all(
    items.map(async (item) => {
      const storagePath = getStoragePath(item);

      if (!storagePath) {
        return {
          ...item,
          signedUrl: null,
        };
      }

      const { data, error } = await supabase.storage
        .from("memory-media")
        .createSignedUrl(storagePath, MEMORY_MEDIA_SIGNED_URL_TTL_SECONDS);

      return {
        ...item,
        signedUrl: error || !data?.signedUrl ? null : data.signedUrl,
      };
    }),
  );

  return signedItems;
};
