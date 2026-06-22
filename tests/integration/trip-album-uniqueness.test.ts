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

// A trip may have at most one album: albums.trip_id is UNIQUE and create_album_with_items raises
// TRIP_ALBUM_ALREADY_EXISTS when the trip already has one (the existence check precedes the
// media-eligibility loop, so a second call short-circuits regardless of the selection). The first
// call only succeeds when the selected media is tz-eligible (parent memory's couple-local
// happened_at inside the trip window), so the fixture mirrors the proven eligible-media shape.
describe('create_album_with_items trip-album uniqueness', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let tripId: string;
  let mediaId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    // Trip 2026-02-01..2026-02-10 with one memory dated 2026-02-05 (couple-local) and its media,
    // so the first album's selection is eligible (avoids INVALID_ALBUM_MEDIA_SELECTION).
    tripId = runSql(
      `insert into public.trips (couple_id, created_by_user_id, title, start_date, end_date) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, 'Trip', '2026-02-01', '2026-02-10') returning id;`,
    );
    const memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, '2026-02-05T12:00:00Z') returning id;`,
    );
    mediaId = runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, 'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/photo.jpg', 'image', 'image/jpeg', 1024) returning id;`,
    );
  });

  afterAll(() => {
    resetCoupleData();
  });

  const albumCountForTrip = (): number =>
    Number(runSql(`select count(*) from public.albums where trip_id = ${lit(tripId)};`));

  it('blocks a second album for the same trip and leaves the first intact', async () => {
    const { error: firstError } = await partnerA.client.rpc('create_album_with_items', {
      target_trip_id: tripId,
      album_title: 'First album',
      album_description: null,
      selected_memory_media_ids: [mediaId],
    });
    // A failure here means the seed instant fell outside the tz window, not a real defect — fix
    // the seed, not the assertion.
    expect(firstError).toBeNull();
    expect(albumCountForTrip()).toBe(1);

    const { error: secondError } = await partnerA.client.rpc('create_album_with_items', {
      target_trip_id: tripId,
      album_title: 'Second album',
      album_description: null,
      selected_memory_media_ids: [mediaId],
    });

    expect(secondError?.message).toContain('TRIP_ALBUM_ALREADY_EXISTS');
    expect(albumCountForTrip()).toBe(1);
  });
});
