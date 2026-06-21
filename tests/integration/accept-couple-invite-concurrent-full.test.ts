import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple, seedUnusedInvite } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

const countActiveMemberships = (): string =>
  runSql(`select count(*) from public.couple_memberships where status = 'active';`);

describe('accept_couple_invite under a concurrent second-member race', () => {
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

  // Whether the loser collides on the active-role unique index (the raw 23505 the
  // audit flagged) or loses on the early active-count guard is timing-dependent, so
  // the race is repeated several rounds. Post-fix the loser ALWAYS surfaces
  // COUPLE_FULL; pre-fix any round that hits the index path leaks a raw unique
  // violation and fails this invariant.
  const RACE_ROUNDS = 6;

  it('lets exactly one of two concurrent accepts win and always surfaces COUPLE_FULL to the loser', async () => {
    for (let round = 0; round < RACE_ROUNDS; round += 1) {
      resetCoupleData();

      const partnerA = await createSignedInMember(admin, `creator-${randomUUID()}@example.test`);
      const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

      // Two distinct unused invites so the per-row FOR UPDATE lock does not serialize
      // the two accepts; the active-role unique index is what must reject the loser.
      const tokenB = seedUnusedInvite(coupleId, partnerA.userId);
      const tokenC = seedUnusedInvite(coupleId, partnerA.userId);

      const userB = await createSignedInMember(admin, `joiner-b-${randomUUID()}@example.test`);
      const userC = await createSignedInMember(admin, `joiner-c-${randomUUID()}@example.test`);

      const [resultB, resultC] = await Promise.all([
        userB.client.rpc('accept_couple_invite', { invite_token: tokenB }),
        userC.client.rpc('accept_couple_invite', { invite_token: tokenC }),
      ]);

      const successes = [resultB, resultC].filter((result) => result.error === null);
      const failures = [resultB, resultC].filter((result) => result.error !== null);

      expect(successes, `round ${round}`).toHaveLength(1);
      expect(failures, `round ${round}`).toHaveLength(1);
      expect(failures[0]?.error?.message, `round ${round}`).toContain('COUPLE_FULL');

      // The second member is still correctly rejected: only two active members remain.
      expect(countActiveMemberships(), `round ${round}`).toBe('2');
    }
  });
});
