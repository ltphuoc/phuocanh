import { afterEach, describe, expect, it, vi } from 'vitest';

import { signMemoryMediaStorageItems } from '@/lib/server/memory-media';

// The signer reaches Supabase storage through createSupabaseServerClient; stub it so the
// test asserts only the TTL passed to createSignedUrls, with no live stack.
const { createSignedUrls } = vi.hoisted(() => ({ createSignedUrls: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    storage: {
      from: () => ({ createSignedUrls }),
    },
  })),
}));

const FOUR_HOURS_IN_SECONDS = 60 * 60 * 4;

afterEach(() => {
  vi.clearAllMocks();
});

describe('signMemoryMediaStorageItems', () => {
  it('signs memory media for a 4-hour TTL that outlives a long video view', async () => {
    createSignedUrls.mockResolvedValue({ data: [], error: null });

    await signMemoryMediaStorageItems([{ storagePath: 'couples/c/memories/m/clip.mp4' }]);

    expect(createSignedUrls).toHaveBeenCalledWith(
      ['couples/c/memories/m/clip.mp4'],
      FOUR_HOURS_IN_SECONDS,
    );
    expect(FOUR_HOURS_IN_SECONDS).toBe(14400);
  });

  it('does not call the signer when there are no storage paths', async () => {
    createSignedUrls.mockResolvedValue({ data: [], error: null });

    await signMemoryMediaStorageItems([{ storagePath: null }]);

    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});
