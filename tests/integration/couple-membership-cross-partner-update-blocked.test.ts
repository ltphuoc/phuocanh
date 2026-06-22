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

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// Confirms a member cannot mutate their partner's couple_memberships row. Two layers make
// this non-mutating: the memberships_update RLS policy is scoped to the caller's own row
// (user_id = auth.uid()), and the Data API grant on couple_memberships is SELECT-only
// (20260621140000_data_api_grants_public_tables.sql) — so a PostgREST UPDATE against the partner's
// row is rejected at the grant level or matches zero rows. The assertion is framed on the OUTCOME
// (partner row byte-for-byte unchanged), so it holds whichever way PostgREST responds.
describe('couple_memberships cross-partner update guard', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let partnerB: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-a-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    partnerB = await createSignedInMember(admin, `member-b-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);
  });

  afterAll(() => {
    resetCoupleData();
  });

  const partnerBRow = (): string =>
    runSql(
      `select role || '|' || status from public.couple_memberships ` +
        `where user_id = ${lit(partnerB.userId)};`,
    );

  it("leaves partner B's membership row unchanged when partner A tries to rewrite it", async () => {
    const before = partnerBRow();

    await partnerA.client
      .from('couple_memberships')
      .update({ role: 'partner_a', status: 'inactive' })
      .eq('user_id', partnerB.userId);

    // Whether PostgREST returns permission-denied or a silent 0-row update, the partner's
    // role + status must be exactly what they were before the attempt.
    expect(partnerBRow()).toBe(before);
  });
});
