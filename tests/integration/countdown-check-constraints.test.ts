import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestMember } from './support/supabase-clients';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

describe('countdowns same-row check constraints', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
  });

  afterAll(() => {
    resetCoupleData();
  });

  const baseRow = () => ({
    couple_id: coupleId,
    created_by_user_id: partnerA.userId,
    kind: 'custom' as const,
    target_at: '2027-01-01T00:00:00Z',
  });

  it('accepts a valid title and note', async () => {
    const { error } = await partnerA.client
      .from('countdowns')
      .insert({ ...baseRow(), note: 'See you soon', title: 'Anniversary' });

    expect(error).toBeNull();
  });

  it('rejects a blank (whitespace-only) title', async () => {
    const { error } = await partnerA.client
      .from('countdowns')
      .insert({ ...baseRow(), title: '   ' });

    expect(error).not.toBeNull();
  });

  it('rejects a title longer than 120 chars', async () => {
    const { error } = await partnerA.client
      .from('countdowns')
      .insert({ ...baseRow(), title: 'a'.repeat(121) });

    expect(error).not.toBeNull();
  });

  it('rejects a note longer than 280 chars', async () => {
    const { error } = await partnerA.client
      .from('countdowns')
      .insert({ ...baseRow(), note: 'a'.repeat(281), title: 'Valid title' });

    expect(error).not.toBeNull();
  });
});
