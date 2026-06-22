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
const UNLOCK_AT = '2026-06-01T00:00:00Z'; // in the past so the body is decryptable now
const DATE_TOKEN = '2026-06-01';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// The load-bearing privacy fact behind the unlock-reminder pipeline: the future-note
// body is encrypted in future_note_contents and is ONLY read by get_unlocked_future_note_contents
// (a separate browser-side RPC). claim_reminder_deliveries() returns a payload projection
// (title, dateToken, routePath) and never touches the body, so the edge function cannot leak
// what the claim never returns. We prove both halves with one sentinel body: it is decryptable
// through the unlock RPC yet absent from the claimed reminder.
describe('reminder claim payload excludes the future-note body', () => {
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

  it('returns title + dateToken but never the decrypted body in a future_note_unlock claim', async () => {
    const sentinelBody = `SENTINEL-FUTURE-NOTE-BODY-${randomUUID()}`;
    const title = 'Anniversary surprise';

    // Create the note + encrypted body through the real authenticated RPC path.
    const { data: futureNoteId, error: createError } = await partnerA.client.rpc(
      'create_future_note_with_body',
      { note_title: title, note_unlock_at: UNLOCK_AT, note_body: sentinelBody },
    );
    expect(createError).toBeNull();
    expect(typeof futureNoteId).toBe('string');

    // Sanity: the body really IS stored and decryptable through the unlock RPC, so its
    // absence from the claim below is meaningful (not just an empty seed).
    const { data: unlocked, error: unlockError } = await partnerA.client.rpc(
      'get_unlocked_future_note_contents',
      { target_couple_id: coupleId },
    );
    expect(unlockError).toBeNull();
    expect((unlocked as { body: string }[]).some((row) => row.body === sentinelBody)).toBe(true);

    // Seed a due future_note_unlock reminder whose payload mirrors the enqueue projection.
    const payload = JSON.stringify({ dateToken: DATE_TOKEN, routePath: '/future-notes', title });
    const reminderId = runSql(
      `insert into public.reminder_deliveries ` +
        `(couple_id, recipient_user_id, recipient_email, kind, source_id, payload, due_at, not_before, status) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, ${lit(partnerA.email)}, 'future_note_unlock', ` +
        `${lit(futureNoteId as string)}, ${lit(payload)}::jsonb, now() - interval '1 hour', now() - interval '1 hour', 'pending') ` +
        `returning id;`,
    );

    const { data: claimed, error: claimError } = await admin.rpc('claim_reminder_deliveries', {
      max_batch_size: 25,
    });
    expect(claimError).toBeNull();

    const claimedRow = (claimed as { id: string; payload: Record<string, unknown> }[]).find(
      (row) => row.id === reminderId,
    );
    expect(claimedRow).toBeDefined();

    // Payload carries only the safe metadata fields.
    expect(claimedRow?.payload.title).toBe(title);
    expect(claimedRow?.payload.dateToken).toBe(DATE_TOKEN);
    expect(claimedRow).not.toHaveProperty('body');
    expect(claimedRow).not.toHaveProperty('body_encrypted');

    // The decrypted body sentinel never appears anywhere in the serialized claim result.
    expect(JSON.stringify(claimed)).not.toContain(sentinelBody);
  });
});
