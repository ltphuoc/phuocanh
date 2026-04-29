import type { Simplify } from 'type-fest';

import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  'storagePath' in item ? item.storagePath : item.storage_path;

export const signMemoryMediaStorageItems = async <TItem extends StoragePathItem>(
  items: readonly TItem[],
): Promise<readonly SignedStoragePathItem<TItem>[]> => {
  const supabase = await createSupabaseServerClient();
  const storagePaths = Array.from(
    new Set(
      items.flatMap((item) => {
        const storagePath = getStoragePath(item);
        return storagePath ? [storagePath] : [];
      }),
    ),
  );

  const signedUrlByPath = new Map<string, string | null>();
  if (storagePaths.length) {
    const { data, error } = await supabase.storage
      .from('memory-media')
      .createSignedUrls(storagePaths, MEMORY_MEDIA_SIGNED_URL_TTL_SECONDS);

    if (error) {
      storagePaths.forEach((storagePath) => {
        signedUrlByPath.set(storagePath, null);
      });
    } else {
      data.forEach((item) => {
        if (item.path) {
          signedUrlByPath.set(item.path, item.signedUrl);
        }
      });
    }
  }

  return items.map((item) => {
    const storagePath = getStoragePath(item);

    return {
      ...item,
      signedUrl: storagePath ? (signedUrlByPath.get(storagePath) ?? null) : null,
    };
  });
};
