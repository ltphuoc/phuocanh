import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialActionState } from '@/lib/actions/action-state';

// Characterization test for the storage half of eraseCoupleSpaceAction. The action reads the
// couple's memory_media storage paths, removes the storage objects in chunks of 100, and only THEN
// calls the erase_couple_space RPC. Wiping storage BEFORE the DB erase is what makes the action
// crash-safe / retryable: a crash before the RPC leaves memory_media intact to re-read. On a remove
// failure it must bail out without calling the RPC. This is a focused unit test of the call CONTRACT
// (which calls fire, with which args, in which order) against a mocked client — the real DB-side
// erase is covered by the erase-couple-space integration test.

const { createSupabaseServerClient, requireReadyCoupleContext } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  requireReadyCoupleContext: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));
vi.mock('@/lib/server/couple-context', () => ({ requireReadyCoupleContext }));
vi.mock('@/lib/i18n/revalidate', () => ({ revalidateLocalizedPath: vi.fn() }));

const { eraseCoupleSpaceAction } = await import('@/app/actions/settings-actions');

const COUPLE_ID = '11111111-1111-4111-8111-111111111111';
const ERASE_RPC = 'erase_couple_space';

const buildFormData = (confirmation?: string): FormData => {
  const formData = new FormData();
  if (confirmation !== undefined) {
    formData.set('confirmation', confirmation);
  }
  return formData;
};

interface MockSpies {
  readonly selectEq: ReturnType<typeof vi.fn>;
  readonly remove: ReturnType<typeof vi.fn>;
  readonly rpc: ReturnType<typeof vi.fn>;
}

// Mock client covering only the surface eraseCoupleSpaceAction touches:
// from('memory_media').select('storage_path').eq('couple_id', id), storage.from().remove, rpc.
const buildSupabaseMock = (): { client: unknown; spies: MockSpies } => {
  const spies: MockSpies = {
    selectEq: vi.fn(),
    remove: vi.fn().mockResolvedValue({ error: null }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'memory_media') {
        return { select: vi.fn(() => ({ eq: spies.selectEq })) };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    storage: { from: vi.fn(() => ({ remove: spies.remove })) },
    rpc: spies.rpc,
  };

  return { client, spies };
};

const seedPaths = (count: number): string[] =>
  Array.from({ length: count }, (_value, index) => `couples/${COUPLE_ID}/memories/m/${index}.jpg`);

const setMediaRows = (spies: MockSpies, paths: string[]): void => {
  spies.selectEq.mockResolvedValue({
    data: paths.map((storage_path) => ({ storage_path })),
    error: null,
  });
};

describe('eraseCoupleSpaceAction storage wipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireReadyCoupleContext.mockResolvedValue({ coupleId: COUPLE_ID });
  });

  it('removes the storage objects then calls the erase RPC once and returns success', async () => {
    const { client, spies } = buildSupabaseMock();
    const paths = seedPaths(3);
    setMediaRows(spies, paths);
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await eraseCoupleSpaceAction(initialActionState, buildFormData('DELETE'));

    expect(result).toEqual({ status: 'success', message: 'settings.couple.erased' });
    expect(spies.remove).toHaveBeenCalledTimes(1);
    expect(spies.remove).toHaveBeenCalledWith(paths);
    expect(spies.rpc).toHaveBeenCalledTimes(1);
    expect(spies.rpc).toHaveBeenCalledWith(ERASE_RPC);
  });

  it('removes storage objects strictly before the erase RPC (retry-safe ordering)', async () => {
    const { client, spies } = buildSupabaseMock();
    setMediaRows(spies, seedPaths(3));
    createSupabaseServerClient.mockResolvedValue(client);

    await eraseCoupleSpaceAction(initialActionState, buildFormData('DELETE'));

    // invocationCallOrder is a global monotonic counter shared across all spies; comparing the two
    // separate spies proves the remove fired before the RPC.
    expect(Math.min(...spies.remove.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...spies.rpc.mock.invocationCallOrder),
    );
  });

  it('chunks removals at 100 paths and runs every chunk before the RPC', async () => {
    const { client, spies } = buildSupabaseMock();
    setMediaRows(spies, seedPaths(150));
    createSupabaseServerClient.mockResolvedValue(client);

    await eraseCoupleSpaceAction(initialActionState, buildFormData('DELETE'));

    expect(spies.remove).toHaveBeenCalledTimes(2);
    expect(spies.remove.mock.calls[0]?.[0]).toHaveLength(100);
    expect(spies.remove.mock.calls[1]?.[0]).toHaveLength(50);
    expect(Math.max(...spies.remove.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...spies.rpc.mock.invocationCallOrder),
    );
  });

  it('bails out without calling the erase RPC when a removal fails', async () => {
    const { client, spies } = buildSupabaseMock();
    setMediaRows(spies, seedPaths(3));
    spies.remove.mockResolvedValue({ error: { message: 'storage remove failed' } });
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await eraseCoupleSpaceAction(initialActionState, buildFormData('DELETE'));

    expect(result).toEqual({ status: 'error', message: 'unexpectedError' });
    expect(spies.rpc).not.toHaveBeenCalled();
  });

  it('rejects a missing/incorrect confirmation without touching storage or the RPC', async () => {
    const { client, spies } = buildSupabaseMock();
    setMediaRows(spies, seedPaths(3));
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await eraseCoupleSpaceAction(initialActionState, buildFormData('delete'));

    expect(result).toEqual({ status: 'error', message: 'unexpectedError' });
    expect(spies.remove).not.toHaveBeenCalled();
    expect(spies.rpc).not.toHaveBeenCalled();
  });
});
