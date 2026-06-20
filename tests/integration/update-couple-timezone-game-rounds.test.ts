import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getCurrentDateTokenInTimeZone } from '@/lib/utils/couple-timezone';

import { addSecondMember, bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

// A timezone pair guaranteed to shift the couple-local day for at least part of
// every UTC day. The reconciliation must clear today-or-future not-yet-revealed
// rounds computed under the OLD zone so they regenerate cleanly under the NEW zone.
const OLD_TZ = 'America/New_York';
const NEW_TZ = 'Asia/Ho_Chi_Minh';

interface SeedRoundOptions {
  readonly coupleId: string;
  readonly mode: 'daily_question' | 'guess_date' | 'trivia';
  readonly roundDate: string;
  readonly promptSource: 'openai' | 'memory';
  readonly promptText: string;
}

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const shiftDateToken = (token: string, days: number): string => {
  const segments = token.split('-');
  const year = Number(segments[0]);
  const month = Number(segments[1]);
  const day = Number(segments[2]);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

// Fixture seeding uses the privileged psql connection (the game tables expose no
// PostgREST DML to any role). The behaviour under test is still invoked through a
// real authenticated client below.
const seedRound = (options: SeedRoundOptions): string =>
  runSql(
    `insert into public.game_rounds ` +
      `(couple_id, mode, round_date, prompt_locale, prompt_source, prompt_text) values (` +
      `${lit(options.coupleId)}, ${lit(options.mode)}, ${lit(options.roundDate)}, ` +
      `'en', ${lit(options.promptSource)}, ${lit(options.promptText)}) returning id;`,
  );

const seedAnswer = (roundId: string, userId: string, answerBody = 'an answer'): void => {
  runSql(
    `insert into public.game_round_answers (round_id, user_id, answer_body) values (` +
      `${lit(roundId)}, ${lit(userId)}, ${lit(answerBody)});`,
  );
};

const fetchRoundDate = (roundId: string): string | null => {
  const result = runSql(`select round_date from public.game_rounds where id = ${lit(roundId)};`);
  return result === '' ? null : result;
};

const countAnswers = (roundId: string): number =>
  Number(
    runSql(`select count(*) from public.game_round_answers where round_id = ${lit(roundId)};`),
  );

describe('update_couple_timezone game-round reconciliation', () => {
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

  it('deletes not-yet-revealed in-flight rounds while preserving revealed and past rounds (2 members)', async () => {
    const partnerA = await createSignedInMember(admin, `a-${randomUUID()}@example.test`);
    const partnerB = await createSignedInMember(admin, `b-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: OLD_TZ });
    await addSecondMember(coupleId, partnerA, partnerB);

    const oldToday = getCurrentDateTokenInTimeZone(OLD_TZ);
    const futureDate = shiftDateToken(oldToday, 1);
    const pastDate = shiftDateToken(oldToday, -30);

    // (a) revealed daily_question round dated today (2 answers) -> preserved.
    const revealedRoundId = seedRound({
      coupleId,
      mode: 'daily_question',
      roundDate: oldToday,
      promptSource: 'openai',
      promptText: 'revealed prompt',
    });
    seedAnswer(revealedRoundId, partnerA.userId);
    seedAnswer(revealedRoundId, partnerB.userId);

    // (b) in-flight daily_question round dated tomorrow (1 of 2 answers) -> deleted.
    const inFlightRoundId = seedRound({
      coupleId,
      mode: 'daily_question',
      roundDate: futureDate,
      promptSource: 'openai',
      promptText: 'in-flight prompt',
    });
    seedAnswer(inFlightRoundId, partnerA.userId);

    // (c) past daily_question round (1 answer, date < today) -> preserved.
    const pastRoundId = seedRound({
      coupleId,
      mode: 'daily_question',
      roundDate: pastDate,
      promptSource: 'openai',
      promptText: 'past prompt',
    });
    seedAnswer(pastRoundId, partnerA.userId);

    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: NEW_TZ,
    });
    expect(error).toBeNull();

    // (b) deleted, its answers cascaded away.
    expect(fetchRoundDate(inFlightRoundId)).toBeNull();
    expect(countAnswers(inFlightRoundId)).toBe(0);

    // (a) + (c) preserved with original round_date tokens.
    expect(fetchRoundDate(revealedRoundId)).toBe(oldToday);
    expect(fetchRoundDate(pastRoundId)).toBe(pastDate);

    // Regenerating today's round under the NEW zone must not collide or orphan.
    const newToday = getCurrentDateTokenInTimeZone(NEW_TZ);
    const { data: ensuredRoundId, error: ensureError } = await partnerA.client.rpc(
      'ensure_daily_question_round',
      {
        target_mode: 'daily_question',
        target_round_date: newToday,
        prompt_locale: 'en',
        prompt_text: 'regenerated prompt',
        prompt_source: 'openai',
      },
    );
    expect(ensureError).toBeNull();
    expect(ensuredRoundId).toBeTruthy();
  });

  it('preserves an already-revealed solo guess_date round (1 answer) and deletes an empty one', async () => {
    const partnerA = await createSignedInMember(admin, `solo-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: OLD_TZ });

    const oldToday = getCurrentDateTokenInTimeZone(OLD_TZ);
    const futureDate = shiftDateToken(oldToday, 1);

    // Solo couple reveals guess_date at 1 answer, so this today-dated round is
    // already revealed and MUST survive. A flat "< 2 answers" predicate would
    // wrongly destroy it.
    const revealedSoloRoundId = seedRound({
      coupleId,
      mode: 'guess_date',
      roundDate: oldToday,
      promptSource: 'memory',
      promptText: 'solo clue',
    });
    seedAnswer(revealedSoloRoundId, partnerA.userId, '2024-02-02');

    // Empty solo round in the live window -> deleted.
    const emptySoloRoundId = seedRound({
      coupleId,
      mode: 'guess_date',
      roundDate: futureDate,
      promptSource: 'memory',
      promptText: 'empty clue',
    });

    const { error } = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: NEW_TZ,
    });
    expect(error).toBeNull();

    expect(fetchRoundDate(revealedSoloRoundId)).toBe(oldToday);
    expect(fetchRoundDate(emptySoloRoundId)).toBeNull();
  });
});
