import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

// Locks the contract the auth-gate refactor depends on: hasAnyCouple resolves the
// gate through the has_any_couple() RPC alone (no service-role admin client). The RPC
// is SECURITY DEFINER, so a signed-in member sees couple existence regardless of RLS.
describe('has_any_couple RPC contract', () => {
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

  it('returns true when a couple exists and false after the couple is removed', async () => {
    const member = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    await bootstrapCouple(member, { timezone: COUPLE_TZ });

    const whenPresent = await member.client.rpc('has_any_couple');
    expect(whenPresent.error).toBeNull();
    expect(whenPresent.data).toBe(true);

    resetCoupleData();

    const stillSignedIn = await createSignedInMember(admin, `probe-${randomUUID()}@example.test`);
    const whenAbsent = await stillSignedIn.client.rpc('has_any_couple');
    expect(whenAbsent.error).toBeNull();
    expect(whenAbsent.data).toBe(false);
  });
});
