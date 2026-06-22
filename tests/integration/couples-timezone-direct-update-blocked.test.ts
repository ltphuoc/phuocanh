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
const NEW_TZ = 'America/New_York';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// Confirms timezone may only change through update_couple_timezone(), which rewrites
// reminder due-dates to preserve the wall-clock. Two layers keep the direct path closed:
//   1. Grant: the later 20260621140000_data_api_grants_public_tables.sql grants authenticated
//      only SELECT on couples, so a direct PostgREST UPDATE is denied at the grant level today
//      ("permission denied for table couples").
//   2. Defense-in-depth trigger couples_reject_direct_timezone_update
//      (20260602145000_rls_least_privilege_hardening.sql) raises TIMEZONE_UPDATE_REQUIRES_RPC
//      for any authenticated/anon role that does hold UPDATE.
// The SECURITY DEFINER RPC runs as the owner and bypasses both. The test asserts the OUTCOME
// (direct write rejected, value unchanged) so it stays valid whichever layer is the active gate.
describe('couples timezone direct-update guard', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-a-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
  });

  afterAll(() => {
    resetCoupleData();
  });

  const storedTimezone = (): string =>
    runSql(`select timezone from public.couples where id = ${lit(coupleId)};`);

  it('rejects a direct authenticated timezone update and leaves the value unchanged', async () => {
    const { error } = await partnerA.client
      .from('couples')
      .update({ timezone: NEW_TZ })
      .eq('id', coupleId);

    // Rejected by the active gate (grant-level "permission denied" today, the trigger's
    // TIMEZONE_UPDATE_REQUIRES_RPC as the deeper backstop) — either way, no mutation.
    expect(error).not.toBeNull();
    expect(storedTimezone()).toBe(COUPLE_TZ);
  });

  it('still allows the update_couple_timezone RPC path', async () => {
    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: NEW_TZ,
    });

    expect(error).toBeNull();
    expect(storedTimezone()).toBe(NEW_TZ);
  });
});
