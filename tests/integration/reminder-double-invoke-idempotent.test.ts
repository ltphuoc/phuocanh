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

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// The DB-enforced half of the reminder no-double-send guarantee, from
// supabase/migrations/20260331120000_phase2_closeout_reminders_encrypted_future_notes.sql:
//   - unique (kind, source_id, recipient_user_id) + the enqueue path's
//     `on conflict ... do nothing` collapse a duplicate enqueue to a single row;
//   - claim_reminder_deliveries() only selects `pending` (or stale `processing`) rows
//     `for update skip locked`, so an in-flight `processing` row is not re-claimed and a
//     terminal `sent` row is never re-selected.
// Fixtures are seeded with the privileged psql connection; the claim is invoked through the
// service-role admin client (the only role the RPC accepts — it is what the edge function uses).
describe('reminder delivery double-invoke idempotency', () => {
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

  // Seeds a claimable reminder_delivery row (not_before/due_at already in the past) and
  // returns its id. `onConflict` mirrors the enqueue path so a duplicate tuple is a no-op.
  const seedReminder = (options: {
    readonly sourceId: string;
    readonly kind?: string;
    readonly status?: string;
    readonly onConflict?: boolean;
  }): string => {
    const kind = options.kind ?? 'countdown_day_of';
    const status = options.status ?? 'pending';
    const conflict = options.onConflict
      ? ' on conflict (kind, source_id, recipient_user_id) do nothing'
      : '';

    return runSql(
      `insert into public.reminder_deliveries ` +
        `(couple_id, recipient_user_id, recipient_email, kind, source_id, payload, due_at, not_before, status) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, ${lit(partnerA.email)}, ${lit(kind)}, ` +
        `${lit(options.sourceId)}, '{}'::jsonb, now() - interval '1 hour', now() - interval '1 hour', ${lit(status)})` +
        `${conflict} returning id;`,
    );
  };

  const tupleCount = (sourceId: string): number =>
    Number(
      runSql(
        `select count(*) from public.reminder_deliveries ` +
          `where kind = 'countdown_day_of' and source_id = ${lit(sourceId)} ` +
          `and recipient_user_id = ${lit(partnerA.userId)};`,
      ),
    );

  const statusOf = (reminderId: string): string =>
    runSql(`select status from public.reminder_deliveries where id = ${lit(reminderId)};`);

  const claimBatch = async (): Promise<readonly { id: string }[]> => {
    const { data, error } = await admin.rpc('claim_reminder_deliveries', { max_batch_size: 25 });
    expect(error).toBeNull();
    return (data ?? []) as { id: string }[];
  };

  it('collapses a duplicate enqueue (same kind/source/recipient) to one row', () => {
    const sourceId = randomUUID();
    seedReminder({ sourceId });

    // The enqueue path re-inserts the same tuple with `on conflict do nothing`.
    seedReminder({ sourceId, onConflict: true });
    expect(tupleCount(sourceId)).toBe(1);

    // The unique constraint itself rejects a plain duplicate insert.
    expect(() => seedReminder({ sourceId })).toThrow(/duplicate key|unique/i);
    expect(tupleCount(sourceId)).toBe(1);
  });

  it('does not re-claim an in-flight row and never re-selects a sent row', async () => {
    const reminderId = seedReminder({ sourceId: randomUUID() });

    const firstBatch = await claimBatch();
    expect(firstBatch.some((row) => row.id === reminderId)).toBe(true);
    expect(statusOf(reminderId)).toBe('processing');

    // Immediately re-claiming must skip the freshly-claimed (non-stale) processing row.
    const secondBatch = await claimBatch();
    expect(secondBatch.some((row) => row.id === reminderId)).toBe(false);

    // A terminal `sent` row is excluded by the claim WHERE clause forever.
    runSql(
      `update public.reminder_deliveries set status = 'sent', sent_at = now() where id = ${lit(reminderId)};`,
    );
    const thirdBatch = await claimBatch();
    expect(thirdBatch.some((row) => row.id === reminderId)).toBe(false);
  });
});
