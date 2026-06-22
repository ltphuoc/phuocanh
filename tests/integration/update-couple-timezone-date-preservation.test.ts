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

const OLD_TZ = 'Asia/Ho_Chi_Minh';
const NEW_TZ = 'America/New_York';

// 18:00Z lands on different calendar days in the two zones: 2026-07-16 in Asia/Ho_Chi_Minh
// (UTC+7 -> 01:00 next day) but 2026-07-15 in America/New_York (UTC-4 -> 14:00 same day). So a
// broken rewrite that left target_at/unlock_at as their original instant would read back a
// DIFFERENT date token in the new zone, failing the assertion.
const SEED_INSTANT = '2026-07-15T18:00:00Z';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// update_couple_timezone rewrites countdown target_at and future-note unlock_at so each keeps its
// wall-clock CALENDAR DATE in the new zone (midnight of the same local day); the underlying UTC
// instant intentionally shifts. Memory rows are NOT reconciled. game_rounds reconciliation is
// covered separately by update-couple-timezone-game-rounds.test.ts. Fixtures are seeded via the
// privileged psql path; the behaviour is invoked through a real signed-in member client.
describe('update_couple_timezone wall-clock date preservation', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-a-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: OLD_TZ });
  });

  afterAll(() => {
    resetCoupleData();
  });

  const dateTokenInTz = (table: string, column: string, tz: string): string =>
    runSql(
      `select (${column} at time zone ${lit(tz)})::date from public.${table} ` +
        `where couple_id = ${lit(coupleId)};`,
    );

  const rawValue = (table: string, column: string): string =>
    runSql(`select ${column} from public.${table} where couple_id = ${lit(coupleId)};`);

  it('preserves countdown + future-note wall-clock date across a zone change while leaving memories untouched', async () => {
    runSql(
      `insert into public.countdowns (couple_id, created_by_user_id, title, target_at) values (` +
        `${lit(coupleId)}, ${lit(partnerA.userId)}, 'Anniversary', ${lit(SEED_INSTANT)});`,
    );
    runSql(
      `insert into public.future_notes (couple_id, created_by_user_id, title, unlock_at) values (` +
        `${lit(coupleId)}, ${lit(partnerA.userId)}, 'Open later', ${lit(SEED_INSTANT)});`,
    );
    runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) values (` +
        `${lit(coupleId)}, ${lit(partnerA.userId)}, ${lit(SEED_INSTANT)});`,
    );

    const oldCountdownToken = dateTokenInTz('countdowns', 'target_at', OLD_TZ);
    const oldNoteToken = dateTokenInTz('future_notes', 'unlock_at', OLD_TZ);
    const rawCountdownBefore = rawValue('countdowns', 'target_at');
    const rawNoteBefore = rawValue('future_notes', 'unlock_at');
    const rawMemoryBefore = rawValue('memories', 'happened_at');

    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: NEW_TZ,
    });
    expect(error).toBeNull();

    // Wall-clock calendar date is preserved in the new zone...
    expect(dateTokenInTz('countdowns', 'target_at', NEW_TZ)).toBe(oldCountdownToken);
    expect(dateTokenInTz('future_notes', 'unlock_at', NEW_TZ)).toBe(oldNoteToken);

    // ...while the underlying instant genuinely shifted (the rewrite did real work).
    expect(rawValue('countdowns', 'target_at')).not.toBe(rawCountdownBefore);
    expect(rawValue('future_notes', 'unlock_at')).not.toBe(rawNoteBefore);

    // Memories are not reconciled by the timezone change.
    expect(rawValue('memories', 'happened_at')).toBe(rawMemoryBefore);
  });
});
