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

// Tables that must stay invisible to the Data API: their bodies (future-note
// contents, gameplay answers, guess-date / trivia targets) are reachable only
// through SECURITY DEFINER RPCs, never a direct browser-readable select. This guard
// locks that posture so a future grant cannot silently re-expose them.
const RPC_ONLY_TABLES = [
  'future_note_contents',
  'game_round_answers',
  'game_round_memory_targets',
  'game_round_trivia_targets',
] as const;

describe('RPC-only tables reject direct Data API reads', () => {
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

  it('returns a permission/exposure error and no rows for a signed-in member', async () => {
    const partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    for (const table of RPC_ONLY_TABLES) {
      const { data, error } = await partnerA.client.from(table).select('*').limit(1);

      expect(error, table).not.toBeNull();
      expect(data, table).toBeNull();
    }
  });
});
