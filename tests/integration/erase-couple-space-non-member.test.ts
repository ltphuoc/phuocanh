import type { SupabaseClient } from '@supabase/supabase-js';

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

// Confirms the member gate inside erase_couple_space: the RPC resolves the couple
// from the caller's OWN active membership, so a signed-in non-member gets NOT_A_MEMBER
// and the couple graph is left fully intact — no partial teardown.
describe('erase_couple_space non-member guard', () => {
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

  it('rejects a non-member with NOT_A_MEMBER and deletes nothing', async () => {
    const partnerA = await createSignedInMember(admin, `owner-a-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    const partnerB = await createSignedInMember(admin, `owner-b-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);

    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);
    const { error } = await stranger.client.rpc('erase_couple_space');

    expect(error?.message).toContain('NOT_A_MEMBER');
    // The couple and both memberships survive untouched.
    expect(Number(runSql('select count(*) from public.couples;'))).toBe(1);
    expect(
      Number(
        runSql(
          `select count(*) from public.couple_memberships where couple_id = '${coupleId.replaceAll("'", "''")}' and status = 'active';`,
        ),
      ),
    ).toBe(2);
  });

  // erase_couple_space is retry-safe. The first successful erase deletes the caller's
  // membership (via the couples cascade), so on a second call the member gate resolves no active
  // membership and raises NOT_A_MEMBER — never a partial teardown or a raw cascade error. Either
  // member re-running the erase is equally a no-op.
  it('is retry-safe: a second erase by the same caller is a NOT_A_MEMBER no-op', async () => {
    const partnerA = await createSignedInMember(admin, `owner-a-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    const partnerB = await createSignedInMember(admin, `owner-b-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);

    const { error: firstError } = await partnerA.client.rpc('erase_couple_space');
    expect(firstError).toBeNull();
    expect(Number(runSql('select count(*) from public.couples;'))).toBe(0);
    expect(Number(runSql('select count(*) from public.couple_memberships;'))).toBe(0);

    // Same caller retries: the gate (not an idempotent delete) makes it safe.
    const { error: retryError } = await partnerA.client.rpc('erase_couple_space');
    expect(retryError?.message).toContain('NOT_A_MEMBER');
    expect(Number(runSql('select count(*) from public.couples;'))).toBe(0);

    // The former partner is also a non-member now and gets the same no-op rejection.
    const { error: partnerBError } = await partnerB.client.rpc('erase_couple_space');
    expect(partnerBError?.message).toContain('NOT_A_MEMBER');
    expect(Number(runSql('select count(*) from public.couples;'))).toBe(0);
  });
});
