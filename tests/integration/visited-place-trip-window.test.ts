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

// visited_places.visited_on must fall inside its trip's [start_date, end_date]. The app action
// validates this before inserting, so to reach the RLS WITH CHECK backstop (the guard against a
// direct-write bypass) the test inserts DIRECTLY through the signed-in client. visited_places is
// PostgREST-DML-granted to authenticated, so the WITH CHECK is the active gate. The block case is
// framed on the OUTCOME (no row created) so it holds whether PostgREST surfaces an RLS error or a
// silent zero-row insert.
describe('visited_places trip-window guard', () => {
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

    tripId = runSql(
      `insert into public.trips (couple_id, created_by_user_id, title, start_date, end_date) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, 'Trip', '2026-02-01', '2026-02-10') returning id;`,
    );
  });

  afterAll(() => {
    resetCoupleData();
  });

  const rowCountForDate = (visitedOn: string): number =>
    Number(
      runSql(
        `select count(*) from public.visited_places ` +
          `where trip_id = ${lit(tripId)} and visited_on = ${lit(visitedOn)};`,
      ),
    );

  const insertVisitedOn = (visitedOn: string) =>
    partnerA.client.from('visited_places').insert({
      couple_id: coupleId,
      trip_id: tripId,
      created_by_user_id: partnerA.userId,
      visited_on: visitedOn,
      title: `Visited ${visitedOn}`,
    });

  it('inserts on the inclusive window boundaries and inside the trip window', async () => {
    // start_date and end_date are inclusive (visited_on between trip.start_date and trip.end_date).
    for (const visitedOn of ['2026-02-01', '2026-02-05', '2026-02-10']) {
      const { error } = await insertVisitedOn(visitedOn);
      expect(error).toBeNull();
      expect(rowCountForDate(visitedOn)).toBe(1);
    }
  });

  it('leaves no row one day outside either boundary while an in-window insert still succeeds', async () => {
    // Control: an in-window insert succeeds, so the blocked out-of-window attempts below are
    // attributable to the WITH CHECK window predicate, not an unrelated insert failure.
    const { error: controlError } = await insertVisitedOn('2026-02-05');
    expect(controlError).toBeNull();
    expect(rowCountForDate('2026-02-05')).toBe(1);

    // Outcome-framed: the WITH CHECK rejects each write (error or silent zero-row), so no row exists.
    for (const visitedOn of ['2026-01-31', '2026-02-11']) {
      await insertVisitedOn(visitedOn);
      expect(rowCountForDate(visitedOn)).toBe(0);
    }
  });
});
