import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

// Proves the transaction-level advisory lock inside bootstrap_first_couple serializes a
// genuine race (#35): when two fresh users with no couple bootstrap at the same instant,
// exactly one wins as partner_a and the loser — now a non-member of the freshly created
// couple — is turned away with COUPLE_EXISTS rather than spawning a second couple.
describe('bootstrap_first_couple concurrent first-couple race', () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(() => {
    resetCoupleData();
  });

  afterAll(() => {
    resetCoupleData();
  });

  it('lets exactly one of two simultaneous bootstraps win', async () => {
    const userOne = await createSignedInMember(admin, `race-one-${randomUUID()}@example.test`);
    const userTwo = await createSignedInMember(admin, `race-two-${randomUUID()}@example.test`);

    const payload = {
      started_date: '2024-01-01',
      couple_name: 'Race Couple',
      target_timezone: COUPLE_TZ,
    };

    const [resultOne, resultTwo] = await Promise.all([
      userOne.client.rpc('bootstrap_first_couple', payload),
      userTwo.client.rpc('bootstrap_first_couple', payload),
    ]);

    const results = [resultOne, resultTwo];
    const winners = results.filter((result) => result.error === null);
    const losers = results.filter((result) => result.error !== null);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]?.error?.message).toContain('COUPLE_EXISTS');
    expect(winners[0]?.data?.[0]?.role).toBe('partner_a');

    // Database settled on a single couple with a single partner_a and no orphan rows.
    expect(Number(runSql('select count(*) from public.couples;'))).toBe(1);
    expect(Number(runSql('select count(*) from public.couple_memberships;'))).toBe(1);
    expect(
      Number(
        runSql(
          "select count(*) from public.couple_memberships where role = 'partner_a' and status = 'active';",
        ),
      ),
    ).toBe(1);
  });
});
