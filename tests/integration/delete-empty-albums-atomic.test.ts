import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestMember } from './support/supabase-clients';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const countAlbums = (albumId: string): string =>
  runSql(`select count(*) from public.albums where id = ${lit(albumId)};`);

const countItems = (albumId: string): string =>
  runSql(`select count(*) from public.album_items where album_id = ${lit(albumId)};`);

// Backs the atomic empty-album cleanup in deleteEmptyAlbums (memory-actions.ts).
// The guarded delete is a single statement (delete_empty_albums RPC) with an in-statement
// NOT EXISTS check, so there is no select-then-delete window where a stale emptiness
// snapshot could drop an album a partner just added to. These tests assert the guard
// itself (a non-empty album is never dropped; an empty one is), which is what closes the
// race by construction; they do not stage a literal concurrent add_album_items. The RPC
// is SECURITY INVOKER, so the albums_delete RLS policy still gates it to couple members.
describe('delete_empty_albums', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let albumId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    const tripId = runSql(
      `insert into public.trips (couple_id, created_by_user_id, title, start_date, end_date) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, 'Trip', '2026-01-10', '2026-01-20') returning id;`,
    );
    const memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, '2026-01-15T12:00:00Z') returning id;`,
    );
    const mediaId = runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, ` +
        `'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/photo.jpg', ` +
        `'image', 'image/jpeg', 1024) returning id;`,
    );
    // Album + its one item must commit together: the deferred albums_require_items
    // trigger rejects an album that commits with zero items.
    albumId = runSql(
      `with new_album as (` +
        `insert into public.albums (couple_id, trip_id, created_by_user_id, title) ` +
        `values (${lit(coupleId)}, ${lit(tripId)}, ${lit(partnerA.userId)}, 'Album') returning id` +
        `) insert into public.album_items (album_id, memory_media_id, position) ` +
        `select id, ${lit(mediaId)}, 1 from new_album returning album_id;`,
    );
  });

  afterAll(() => {
    resetCoupleData();
  });

  const callDeleteEmptyAlbums = (caller: TestMember) =>
    caller.client.rpc('delete_empty_albums', {
      p_album_ids: [albumId],
      p_couple_id: coupleId,
    });

  it('deletes an album once it has no items', async () => {
    // Empty the album via the privileged connection (the deferred require-items
    // trigger only fires on insert, so removing items leaves an empty album behind).
    runSql(`delete from public.album_items where album_id = ${lit(albumId)};`);

    const { error } = await callDeleteEmptyAlbums(partnerA);

    expect(error).toBeNull();
    expect(countAlbums(albumId)).toBe('0');
  });

  it('never deletes an album that still has an item', async () => {
    const { error } = await callDeleteEmptyAlbums(partnerA);

    expect(error).toBeNull();
    expect(countAlbums(albumId)).toBe('1');
    expect(countItems(albumId)).toBe('1');
  });

  it('does not delete the album for a non-member caller even when empty (RLS)', async () => {
    runSql(`delete from public.album_items where album_id = ${lit(albumId)};`);
    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);

    const { error } = await callDeleteEmptyAlbums(stranger);

    expect(error).toBeNull();
    expect(countAlbums(albumId)).toBe('1');
  });
});
