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
const VALID_NEW_TZ = 'America/New_York';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// update_couple_timezone validates the target zone (nullif(btrim(...)) + is_valid_timezone)
// before touching any couple state, raising INVALID_TIMEZONE for a malformed or blank name and
// leaving the stored timezone untouched. A valid IANA zone still succeeds. The behaviour is
// invoked through a real signed-in member client; assertion reads use the privileged psql path.
describe('update_couple_timezone zone validation', () => {
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

  it('rejects a malformed IANA zone and leaves the stored timezone unchanged', async () => {
    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: 'Not/A_Zone',
    });

    expect(error?.message).toContain('INVALID_TIMEZONE');
    expect(storedTimezone()).toBe(COUPLE_TZ);
  });

  it('rejects a blank/whitespace zone (nullif(btrim())) and leaves the stored timezone unchanged', async () => {
    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: '   ',
    });

    expect(error?.message).toContain('INVALID_TIMEZONE');
    expect(storedTimezone()).toBe(COUPLE_TZ);
  });

  it('still accepts a valid IANA zone', async () => {
    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: VALID_NEW_TZ,
    });

    expect(error).toBeNull();
    expect(storedTimezone()).toBe(VALID_NEW_TZ);
  });
});
