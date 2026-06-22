import type { CoupleContext } from '@/lib/server/couple-context';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialActionState } from '@/lib/actions/action-state';

// Characterization test for the create-memory rollback path. createMemoryAction uploads
// media objects, inserts the memory row, then inserts memory_media; if a later step fails after a
// successful upload it must remove the uploaded objects (and delete the memory row when one was
// created) so no orphaned object/row is left. The flow is best-effort and non-transactional (the
// hourly media-sweeper is the backstop), so this is a focused unit test of the cleanup CONTRACT —
// which calls fire with which args — against a mocked Supabase client, not real DB behaviour.

// Hoisted seams so the vi.mock factories below can reference them.
const { createSupabaseServerClient, requireReadyCoupleContext } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  requireReadyCoupleContext: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));
vi.mock('@/lib/server/couple-context', () => ({ requireReadyCoupleContext }));
vi.mock('@/lib/i18n/revalidate', () => ({ revalidateLocalizedPath: vi.fn() }));

// Imported after the mocks are registered (vi.mock is hoisted, but keep intent explicit).
const { createMemoryAction } = await import('@/app/actions/memory-actions');

const COUPLE_ID = '11111111-1111-4111-8111-111111111111';
const MEMORY_ID = '22222222-2222-4222-8222-222222222222';
const STORAGE_PATH = `couples/${COUPLE_ID}/memories/${MEMORY_ID}/1700000000-photo.jpg`;

const buildFormData = (): FormData => {
  const formData = new FormData();
  formData.set('memoryId', MEMORY_ID);
  formData.set('happenedAt', '2026-01-15T12:00:00.000Z');
  formData.append('storagePath', STORAGE_PATH);
  formData.append('mimeType', 'image/jpeg');
  formData.append('originalFileName', 'photo.jpg');
  formData.append('sizeBytes', '1024');
  return formData;
};

interface MockSpies {
  readonly remove: ReturnType<typeof vi.fn>;
  readonly memoriesLimit: ReturnType<typeof vi.fn>;
  readonly memoriesDeleteEq: ReturnType<typeof vi.fn>;
  readonly memoryMediaInsert: ReturnType<typeof vi.fn>;
}

// Minimal Supabase client mock covering only the surface createMemoryAction touches:
// storage.from().remove, from('memories').insert().select().limit, from('memories').delete().eq,
// and from('memory_media').insert.
const buildSupabaseMock = (): { client: unknown; spies: MockSpies } => {
  const spies: MockSpies = {
    remove: vi.fn().mockResolvedValue({ error: null }),
    memoriesLimit: vi.fn(),
    memoriesDeleteEq: vi.fn().mockResolvedValue({ error: null }),
    memoryMediaInsert: vi.fn(),
  };

  const client = {
    storage: { from: vi.fn(() => ({ remove: spies.remove })) },
    from: vi.fn((table: string) => {
      if (table === 'memories') {
        return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ limit: spies.memoriesLimit })) })),
          delete: vi.fn(() => ({ eq: spies.memoriesDeleteEq })),
        };
      }
      if (table === 'memory_media') {
        return { insert: spies.memoryMediaInsert };
      }
      if (table === 'activity_events') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };

  return { client, spies };
};

describe('createMemoryAction upload rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireReadyCoupleContext.mockResolvedValue({
      coupleId: COUPLE_ID,
      userId: 'user-1',
    } as CoupleContext);
  });

  it('removes uploaded objects and deletes the memory row when the media insert fails', async () => {
    const { client, spies } = buildSupabaseMock();
    spies.memoriesLimit.mockResolvedValue({ data: [{ id: MEMORY_ID }], error: null });
    spies.memoryMediaInsert.mockResolvedValue({ error: { message: 'media insert failed' } });
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await createMemoryAction(initialActionState, buildFormData());

    expect(result).toEqual({ status: 'error', message: 'unexpectedError' });
    // Uploaded object is removed, and the now-orphaned memory row is deleted.
    expect(spies.remove).toHaveBeenCalledWith([STORAGE_PATH]);
    expect(spies.memoriesDeleteEq).toHaveBeenCalledWith('id', MEMORY_ID);
  });

  it('removes uploaded objects and never inserts media when the memory row insert fails', async () => {
    const { client, spies } = buildSupabaseMock();
    spies.memoriesLimit.mockResolvedValue({
      data: null,
      error: { message: 'memory insert failed' },
    });
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await createMemoryAction(initialActionState, buildFormData());

    expect(result).toEqual({ status: 'error', message: 'unexpectedError' });
    expect(spies.remove).toHaveBeenCalledWith([STORAGE_PATH]);
    // No row was created, so neither the media insert nor the memory-row delete should run.
    expect(spies.memoryMediaInsert).not.toHaveBeenCalled();
    expect(spies.memoriesDeleteEq).not.toHaveBeenCalled();
  });
});
