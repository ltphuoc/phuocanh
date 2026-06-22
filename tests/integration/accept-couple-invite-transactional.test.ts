import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { addSecondMember, bootstrapCouple, seedUnusedInvite } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const fetchInviteState = (token: string): { acceptedAtNull: boolean; acceptedByNull: boolean } => {
  const [acceptedAtNull, acceptedByNull] = runSql(
    `select accepted_at is null, accepted_by_user_id is null from public.couple_invites where token = ${lit(token)};`,
  ).split('|');
  return { acceptedAtNull: acceptedAtNull === 't', acceptedByNull: acceptedByNull === 't' };
};

// Verifies accept_couple_invite is all-or-nothing on its rejection path (#56). When the
// couple is already full, the failing accept must write NOTHING: no membership row for
// the would-be third member, and the spare invite stays unconsumed — there is never a
// dangling membership without the accepted_at / accepted_by flags, or vice versa.
describe('accept_couple_invite failure-path atomicity', () => {
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

  it('leaves no partial state when a third member accepts into a full couple', async () => {
    const partnerA = await createSignedInMember(admin, `owner-a-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    const partnerB = await createSignedInMember(admin, `owner-b-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);

    // A spare invite exists; a third authenticated user tries to claim it.
    const spareToken = seedUnusedInvite(coupleId, partnerA.userId);
    const thirdUser = await createSignedInMember(admin, `third-${randomUUID()}@example.test`);
    const { error } = await thirdUser.client.rpc('accept_couple_invite', {
      invite_token: spareToken,
    });

    expect(error?.message).toContain('COUPLE_FULL');

    // No partial write: the third user gained no membership and the spare invite is intact.
    expect(
      Number(
        runSql(
          `select count(*) from public.couple_memberships where user_id = ${lit(thirdUser.userId)};`,
        ),
      ),
    ).toBe(0);
    expect(fetchInviteState(spareToken)).toEqual({ acceptedAtNull: true, acceptedByNull: true });

    // The couple still holds exactly its two original active partners.
    expect(
      runSql(
        `select string_agg(role::text, ',' order by role) from public.couple_memberships ` +
          `where couple_id = ${lit(coupleId)} and status = 'active';`,
      ),
    ).toBe('partner_a,partner_b');
  });
});
