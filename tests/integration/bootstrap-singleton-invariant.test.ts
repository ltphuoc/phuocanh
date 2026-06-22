import type { SupabaseClient } from '@supabase/supabase-js';

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

const countCouples = (): number => Number(runSql('select count(*) from public.couples;'));

const countMembershipsForUser = (userId: string): number =>
  Number(
    runSql(
      `select count(*) from public.couple_memberships where user_id = '${userId.replaceAll("'", "''")}';`,
    ),
  );

// Locks the global single-couple invariant at the bootstrap boundary: the RPC never
// attaches a stranger to the existing couple (#2), an existing member re-running it
// gets the same couple back rather than a new one, and the couples_singleton_idx is the
// hard backstop against any second couple row ever existing (#34).
describe('bootstrap_first_couple singleton invariant', () => {
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

  it('rejects a non-member with COUPLE_EXISTS and grants them no membership', async () => {
    const partnerA = await createSignedInMember(admin, `owner-${randomUUID()}@example.test`);
    await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);
    const { error } = await stranger.client.rpc('bootstrap_first_couple', {
      started_date: '2024-02-02',
      couple_name: 'Stranger Couple',
      target_timezone: COUPLE_TZ,
    });

    expect(error?.message).toContain('COUPLE_EXISTS');
    // No implicit attach: the stranger holds no membership and no second couple appeared.
    expect(countMembershipsForUser(stranger.userId)).toBe(0);
    expect(countCouples()).toBe(1);
  });

  it('returns the same couple to an existing member instead of creating a new one', async () => {
    const partnerA = await createSignedInMember(admin, `owner-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    const { data, error } = await partnerA.client.rpc('bootstrap_first_couple', {
      started_date: '2099-12-31',
      couple_name: 'Should Not Replace',
      target_timezone: COUPLE_TZ,
    });

    expect(error).toBeNull();
    expect(data?.[0]?.couple_id).toBe(coupleId);
    expect(countCouples()).toBe(1);
  });

  it('rejects a direct second couples row via the singleton index', async () => {
    const partnerA = await createSignedInMember(admin, `owner-${randomUUID()}@example.test`);
    await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    // Even a privileged direct insert (bypassing the RPC entirely) cannot escape the
    // couples_singleton_idx unique expression index on ((true)).
    expect(() =>
      runSql(
        `insert into public.couples (name, started_at, timezone) values ('Second', '2024-03-03', '${COUPLE_TZ}');`,
      ),
    ).toThrow();
    expect(countCouples()).toBe(1);
  });
});
