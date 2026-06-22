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
const LOCKED_BODY = 'LOCKED-SECRET-do-not-reveal';
const UNLOCKED_BODY = 'UNLOCKED-visible-body';
const DAY_MS = 24 * 60 * 60 * 1000;

const createNote = async (
  member: { client: SupabaseClient },
  title: string,
  unlockAt: string,
  body: string,
): Promise<string> => {
  const { data, error } = await member.client.rpc('create_future_note_with_body', {
    note_title: title,
    note_unlock_at: unlockAt,
    note_body: body,
  });
  if (error) {
    throw new Error(`create_future_note_with_body failed: ${error.message}`);
  }
  return data as string;
};

// Locks the future-note confidentiality contract (#17): metadata is visible immediately,
// but the encrypted body table is Data-API-invisible (RPC-only) and the unlock RPC hands
// back a decrypted body only once unlock_at has passed — never for a still-locked note,
// and never to a non-member.
describe('future-note body stays locked until unlock', () => {
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

  it('gates the body behind unlock_at while exposing metadata immediately', async () => {
    const partnerA = await createSignedInMember(admin, `author-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    const futureUnlock = new Date(Date.now() + DAY_MS).toISOString();
    const pastUnlock = new Date(Date.now() - DAY_MS).toISOString();
    const lockedId = await createNote(partnerA, 'Locked note', futureUnlock, LOCKED_BODY);
    const unlockedId = await createNote(partnerA, 'Unlocked note', pastUnlock, UNLOCKED_BODY);

    // Metadata (title + unlock_at) is readable for both notes regardless of lock state.
    const metadata = await partnerA.client
      .from('future_notes')
      .select('id,title,unlock_at')
      .eq('couple_id', coupleId);
    expect(metadata.error).toBeNull();
    expect(metadata.data).toHaveLength(2);

    // The encrypted body table carries no Data-API grant: a direct read yields no rows
    // (permission denied -> null data, or RLS -> empty), so the body never leaks raw.
    const directBody = await partnerA.client.from('future_note_contents').select('*');
    expect(directBody.data == null || directBody.data.length === 0).toBe(true);

    // The unlock RPC returns ONLY the past-unlock note's decrypted body.
    const unlocked = await partnerA.client.rpc('get_unlocked_future_note_contents', {
      target_couple_id: coupleId,
    });
    expect(unlocked.error).toBeNull();
    expect(unlocked.data).toHaveLength(1);
    expect(unlocked.data?.[0]?.future_note_id).toBe(unlockedId);
    expect(unlocked.data?.[0]?.body).toBe(UNLOCKED_BODY);
    // The still-locked note is absent and its body is never surfaced.
    const returnedIds = (unlocked.data ?? []).map(
      (row: { future_note_id: string }) => row.future_note_id,
    );
    expect(returnedIds).not.toContain(lockedId);
  });

  it('forbids a non-member from reading any unlocked body', async () => {
    const partnerA = await createSignedInMember(admin, `author-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    await createNote(
      partnerA,
      'Unlocked note',
      new Date(Date.now() - DAY_MS).toISOString(),
      UNLOCKED_BODY,
    );

    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);
    const { error } = await stranger.client.rpc('get_unlocked_future_note_contents', {
      target_couple_id: coupleId,
    });

    expect(error?.message).toContain('FORBIDDEN');
  });
});
