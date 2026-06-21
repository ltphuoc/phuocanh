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

// Backs the album-orphan guard in updateTripAction. Counts album items (joined to
// their parent memory) whose couple-local date falls outside a candidate trip window,
// using the SAME couple-timezone predicate as add_album_items so the two never drift.
describe('count_album_items_outside_trip_window', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let tripId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    // Trip 2026-01-10..2026-01-20 with one memory dated 2026-01-15 (couple-local),
    // its media attached to the trip's album. Seeded via the privileged connection;
    // the RPC under test is invoked through the signed-in member client.
    tripId = runSql(
      `insert into public.trips (couple_id, created_by_user_id, title, start_date, end_date) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, 'Trip', '2026-01-10', '2026-01-20') returning id;`,
    );
    const memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, '2026-01-15T12:00:00Z') returning id;`,
    );
    const mediaId = runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, 'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/photo.jpg', 'image', 'image/jpeg', 1024) returning id;`,
    );
    // Album + its one item must commit together: a deferred constraint trigger
    // (albums_require_items) rejects an album that commits with zero items.
    runSql(
      `with new_album as (` +
        `insert into public.albums (couple_id, trip_id, created_by_user_id, title) ` +
        `values (${lit(coupleId)}, ${lit(tripId)}, ${lit(partnerA.userId)}, 'Album') returning id` +
        `) insert into public.album_items (album_id, memory_media_id, position) ` +
        `select id, ${lit(mediaId)}, 1 from new_album;`,
    );
  });

  afterAll(() => {
    resetCoupleData();
  });

  const countOutside = async (startDate: string, endDate: string): Promise<number> => {
    const { data, error } = await partnerA.client.rpc('count_album_items_outside_trip_window', {
      p_end_date: endDate,
      p_start_date: startDate,
      p_trip_id: tripId,
    });

    expect(error).toBeNull();
    return data as number;
  };

  it('counts the item when the narrowed window excludes its memory', async () => {
    expect(await countOutside('2026-01-10', '2026-01-12')).toBeGreaterThan(0);
  });

  it('counts zero when the window still contains the memory', async () => {
    expect(await countOutside('2026-01-10', '2026-01-20')).toBe(0);
  });

  it('treats the window boundary as inclusive', async () => {
    expect(await countOutside('2026-01-15', '2026-01-15')).toBe(0);
  });
});
