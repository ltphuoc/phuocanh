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

// Every public base table is couple-scoped in this single-couple app, so after an erase
// they must all be empty. Enumerating from information_schema (not a hand-copied list)
// means a newly added couple-scoped table is automatically covered.
const allPublicBaseTables = (): string[] =>
  runSql(
    `select table_name from information_schema.tables ` +
      `where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name;`,
  )
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);

const rowCount = (table: string): number => Number(runSql(`select count(*) from public.${table};`));

// Seeds a couple that has data in every couple-scoped table, including BOTH game-target
// kinds (guess_date -> game_round_memory_targets, trivia -> game_round_trivia_targets),
// whose memory_id FKs are ON DELETE RESTRICT. This is the path that aborts a naive
// `delete from couples` and which erase_couple_space must order around (game_rounds first).
const seedRichCouple = (coupleId: string, userId: string): void => {
  const memoryId = runSql(
    `insert into public.memories (couple_id, author_user_id, happened_at, note) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, '2026-01-15T12:00:00Z', 'note') returning id;`,
  );
  const mediaId = runSql(
    `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
      `values (${lit(coupleId)}, ${lit(memoryId)}, ` +
      `'couples/' || ${lit(coupleId)} || '/memories/' || ${lit(memoryId)} || '/p.jpg', ` +
      `'image', 'image/jpeg', 10) returning id;`,
  );
  const tripId = runSql(
    `insert into public.trips (couple_id, created_by_user_id, title, start_date, end_date) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, 'Trip', '2026-01-10', '2026-01-20') returning id;`,
  );
  runSql(
    `with new_album as (` +
      `insert into public.albums (couple_id, trip_id, created_by_user_id, title) ` +
      `values (${lit(coupleId)}, ${lit(tripId)}, ${lit(userId)}, 'Album') returning id` +
      `) insert into public.album_items (album_id, memory_media_id, position) ` +
      `select id, ${lit(mediaId)}, 1 from new_album;`,
  );
  runSql(
    `insert into public.countdowns (couple_id, created_by_user_id, title, target_at) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, 'C', now());`,
  );
  runSql(
    `with new_note as (` +
      `insert into public.future_notes (couple_id, created_by_user_id, title, unlock_at) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, 'N', now()) returning id` +
      `) insert into public.future_note_contents (future_note_id, body_encrypted) ` +
      `select id, decode('00', 'hex') from new_note;`,
  );
  runSql(
    `with new_list as (` +
      `insert into public.checklists (couple_id, title) values (${lit(coupleId)}, 'L') returning id` +
      `) insert into public.checklist_items (checklist_id, text) select id, 'item' from new_list;`,
  );
  runSql(
    `insert into public.wish_items (couple_id, created_by_user_id, title, category) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, 'W', 'place');`,
  );
  runSql(
    `insert into public.visited_places (couple_id, trip_id, created_by_user_id, title, visited_on) ` +
      `values (${lit(coupleId)}, ${lit(tripId)}, ${lit(userId)}, 'P', '2026-01-15');`,
  );
  runSql(
    `insert into public.activity_events (couple_id, actor_user_id, type) ` +
      `values (${lit(coupleId)}, ${lit(userId)}, 'memory_created');`,
  );
  runSql(
    `insert into public.couple_invites (couple_id, token, invited_by_user_id, invited_email, expires_at) ` +
      `values (${lit(coupleId)}, ${lit(randomUUID())}, ${lit(userId)}, 'p@example.test', now() + interval '14 days');`,
  );

  // guess_date round + memory target (RESTRICT FK to memories).
  const guessRound = runSql(
    `insert into public.game_rounds (couple_id, mode, round_date, prompt_locale, prompt_source, prompt_text) ` +
      `values (${lit(coupleId)}, 'guess_date', '2026-01-15', 'en', 'memory', 'When?') returning id;`,
  );
  runSql(
    `insert into public.game_round_memory_targets (round_id, memory_id) ` +
      `values (${lit(guessRound)}, ${lit(memoryId)});`,
  );
  runSql(
    `insert into public.game_round_answers (round_id, user_id, answer_body) ` +
      `values (${lit(guessRound)}, ${lit(userId)}, '2026-01-15');`,
  );

  // trivia round + trivia target (RESTRICT FK to memories).
  const triviaRound = runSql(
    `insert into public.game_rounds (couple_id, mode, round_date, prompt_locale, prompt_source, prompt_text) ` +
      `values (${lit(coupleId)}, 'trivia', '2026-01-16', 'en', 'memory', 'Trivia?') returning id;`,
  );
  runSql(
    `insert into public.game_round_trivia_targets (round_id, memory_id, correct_answer, answer_options) ` +
      `values (${lit(triviaRound)}, ${lit(memoryId)}, 'a', '["a","b","c"]'::jsonb);`,
  );
};

describe('erase_couple_space', () => {
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

  it('erases a couple that has guess-date and trivia targets without a RESTRICT-FK abort', async () => {
    seedRichCouple(coupleId, partnerA.userId);
    // Sanity: the RESTRICT-FK rows that would abort a naive couples delete exist.
    expect(rowCount('game_round_memory_targets')).toBeGreaterThan(0);
    expect(rowCount('game_round_trivia_targets')).toBeGreaterThan(0);

    const { error } = await partnerA.client.rpc('erase_couple_space');
    expect(error).toBeNull();

    // Every couple-scoped table (all of them, in this single-couple app) is now empty.
    for (const table of allPublicBaseTables()) {
      expect(rowCount(table), `table ${table} should be empty after erase`).toBe(0);
    }

    const { data: hasCouple, error: hasCoupleError } = await partnerA.client.rpc('has_any_couple');
    expect(hasCoupleError).toBeNull();
    expect(hasCouple).toBe(false);
  });

  it('lets the same user re-bootstrap a fresh couple after erase', async () => {
    seedRichCouple(coupleId, partnerA.userId);
    await partnerA.client.rpc('erase_couple_space');

    const { data, error } = await partnerA.client.rpc('bootstrap_first_couple', {
      started_date: '2024-02-02',
      couple_name: 'Reborn Couple',
      target_timezone: COUPLE_TZ,
    });

    expect(error).toBeNull();
    expect(data?.[0]?.couple_id).toBeTruthy();
    expect(
      runSql(`select role from public.couple_memberships where user_id = ${lit(partnerA.userId)};`),
    ).toBe('partner_a');
  });

  it('rejects a non-member with NOT_A_MEMBER and deletes nothing', async () => {
    seedRichCouple(coupleId, partnerA.userId);
    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);

    const { error } = await stranger.client.rpc('erase_couple_space');

    expect(error?.message).toContain('NOT_A_MEMBER');
    expect(rowCount('couples')).toBe(1);
    expect(rowCount('memories')).toBeGreaterThan(0);
  });
});
