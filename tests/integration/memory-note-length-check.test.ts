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
const NOTE_MAX_LENGTH = 4000;

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// Backs the database-layer note length cap (memories_note_length_check). The cap
// must hold even on a direct authenticated PostgREST write, because the app-side
// Zod bound can be bypassed by a direct table update — so the behaviour is exercised
// through the signed-in member client, not the privileged psql connection.
describe('memories note length check', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let memoryId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    // Seed the memory with one media row so it stays content-valid regardless of the
    // note value under test (a null/short note can never make it content-empty).
    memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, '2026-01-15T12:00:00Z') returning id;`,
    );
    runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, ` +
        `'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/a.jpg', ` +
        `'image', 'image/jpeg', 1024);`,
    );
  });

  afterAll(() => {
    resetCoupleData();
  });

  const updateNote = (note: string | null) =>
    partnerA.client.from('memories').update({ note }).eq('id', memoryId);

  it('rejects a note longer than the cap on a direct authenticated write', async () => {
    const { error } = await updateNote('x'.repeat(NOTE_MAX_LENGTH + 1));

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514'); // check_violation
  });

  it('accepts a note at exactly the cap', async () => {
    const { error } = await updateNote('x'.repeat(NOTE_MAX_LENGTH));

    expect(error).toBeNull();
  });

  it('accepts a null note', async () => {
    const { error } = await updateNote(null);

    expect(error).toBeNull();
  });
});
