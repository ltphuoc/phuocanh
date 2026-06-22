import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestMember } from './support/supabase-clients';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { addSecondMember, bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';
const HAPPENED_AT = '2026-01-15T12:00:00Z';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// Locks the note-OR->=1-media content invariant that update_memory_media() enforces
// atomically (supabase/migrations/20260602145200_update_memory_media_rpc.sql). The guard
// re-counts media AFTER the deletes inside the same transaction, behind a `for update`
// row lock, so:
//   - an edit that would leave empty note AND zero media raises MEMORY_REQUIRES_CONTENT
//     and rolls the whole transaction back;
//   - two concurrent partner edits that would jointly empty the memory cannot both win —
//     the lock serializes them so exactly one fails and the memory never ends empty.
// Behaviour is driven through signed-in member clients (real JWT -> auth.uid()/is_couple_member);
// fixtures and assertion reads use the privileged psql connection.
describe('update_memory_media content invariant', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let partnerB: TestMember;
  let coupleId: string;
  let memoryId: string;
  let mediaIdA: string;
  let mediaIdB: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-a-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    partnerB = await createSignedInMember(admin, `member-b-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);

    memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, ${lit(HAPPENED_AT)}) returning id;`,
    );
    mediaIdA = seedMedia('a.jpg');
    mediaIdB = seedMedia('b.jpg');
  });

  afterAll(() => {
    resetCoupleData();
  });

  const seedMedia = (fileName: string): string =>
    runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, ` +
        `'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/' || ${lit(fileName)}, ` +
        `'image', 'image/jpeg', 1024) returning id;`,
    );

  const mediaCount = (): number =>
    Number(runSql(`select count(*) from public.memory_media where memory_id = ${lit(memoryId)};`));

  const storedNote = (): string =>
    runSql(`select coalesce(note, '') from public.memories where id = ${lit(memoryId)};`);

  const callUpdate = (
    member: TestMember,
    options: { readonly note: string | null; readonly removeMediaIds: readonly string[] },
  ) =>
    member.client.rpc('update_memory_media', {
      p_memory_id: memoryId,
      p_note: options.note,
      p_happened_at: HAPPENED_AT,
      p_location_address: null,
      p_location_latitude: null,
      p_location_longitude: null,
      p_location_name: null,
      p_location_provider: null,
      p_location_provider_id: null,
      p_remove_media_ids: [...options.removeMediaIds],
      p_add_media: null,
    });

  it('rejects an edit that would empty the memory and leaves the row unchanged', async () => {
    const { error } = await callUpdate(partnerA, {
      note: '',
      removeMediaIds: [mediaIdA, mediaIdB],
    });

    expect(error?.message).toContain('MEMORY_REQUIRES_CONTENT');
    // The exception rolls the whole transaction back: both media rows survive.
    expect(mediaCount()).toBe(2);
  });

  it('allows removing all media when a non-empty note remains', async () => {
    const { error } = await callUpdate(partnerA, {
      note: 'still has a note',
      removeMediaIds: [mediaIdA, mediaIdB],
    });

    expect(error).toBeNull();
    expect(mediaCount()).toBe(0);
    expect(storedNote()).toBe('still has a note');
  });

  it('serializes concurrent dual-empty edits so exactly one fails and the memory stays non-empty', async () => {
    // Each partner removes a disjoint media id with an empty note. Whoever commits first
    // leaves one media row (valid); the second sees zero media + empty note and is rejected.
    const [resultA, resultB] = await Promise.all([
      callUpdate(partnerA, { note: '', removeMediaIds: [mediaIdA] }),
      callUpdate(partnerB, { note: '', removeMediaIds: [mediaIdB] }),
    ]);

    const errors = [resultA.error, resultB.error];
    const failures = errors.filter((error) => error?.message.includes('MEMORY_REQUIRES_CONTENT'));
    const successes = errors.filter((error) => error === null);

    expect(failures).toHaveLength(1);
    expect(successes).toHaveLength(1);
    // The memory is never left empty: at least one media row survives.
    expect(mediaCount()).toBeGreaterThanOrEqual(1);
  });
});
