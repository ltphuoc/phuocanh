import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestMember } from './support/supabase-clients';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { addSecondMember, bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const seedDailyQuestionRound = (coupleId: string, roundDate: string): string =>
  runSql(
    `insert into public.game_rounds (couple_id, mode, round_date, prompt_locale, prompt_source, prompt_text) ` +
      `values (${lit(coupleId)}, 'daily_question', ${lit(roundDate)}, 'en', 'openai', 'What is a favorite memory?') returning id;`,
  );

const seedAnswer = (roundId: string, userId: string, body: string): void => {
  runSql(
    `insert into public.game_round_answers (round_id, user_id, answer_body) ` +
      `values (${lit(roundId)}, ${lit(userId)}, ${lit(body)});`,
  );
};

const deactivateMembership = (userId: string): void => {
  runSql(
    `update public.couple_memberships set status = 'inactive' where user_id = ${lit(userId)};`,
  );
};

const todayInCoupleTz = (): string =>
  runSql(`select (now() at time zone ${lit(COUPLE_TZ)})::date;`);

const roundExists = (roundId: string): boolean =>
  runSql(`select count(*) from public.game_rounds where id = ${lit(roundId)};`) === '1';

describe('daily-question active-member parity', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let partnerB: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-a-${randomUUID()}@example.test`);
    partnerB = await createSignedInMember(admin, `member-b-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    await addSecondMember(coupleId, partnerA, partnerB);
  });

  afterAll(() => {
    resetCoupleData();
  });

  it('reveals at two active answers but not when one answerer is inactive', async () => {
    const roundDate = '2026-03-15';
    const roundId = seedDailyQuestionRound(coupleId, roundDate);
    seedAnswer(roundId, partnerA.userId, 'Answer from A');
    seedAnswer(roundId, partnerB.userId, 'Answer from B');

    const whenBothActive = await partnerA.client.rpc('get_daily_question_round_state', {
      target_round_date: roundDate,
    });
    expect(whenBothActive.error).toBeNull();
    expect(whenBothActive.data?.[0]?.answer_count).toBe(2);
    expect(whenBothActive.data?.[0]?.reveal_answers).toBe(true);

    deactivateMembership(partnerB.userId);

    const whenOneInactive = await partnerA.client.rpc('get_daily_question_round_state', {
      target_round_date: roundDate,
    });
    expect(whenOneInactive.error).toBeNull();
    expect(whenOneInactive.data?.[0]?.answer_count).toBe(1);
    expect(whenOneInactive.data?.[0]?.reveal_answers).toBe(false);
    expect(whenOneInactive.data?.[0]?.revealed_answers).toEqual([]);
  });

  it('excludes an inactive member answer from completed-round stats', async () => {
    const roundId = seedDailyQuestionRound(coupleId, '2026-03-15');
    seedAnswer(roundId, partnerA.userId, 'Answer from A');
    seedAnswer(roundId, partnerB.userId, 'Answer from B');
    deactivateMembership(partnerB.userId);

    const stats = await partnerA.client.rpc('get_daily_question_stats', {
      target_history_days: 30,
    });
    expect(stats.error).toBeNull();
    expect(stats.data?.[0]?.total_completed_rounds).toBe(0);
  });

  it('reconcile preserves a round with two active answers when the timezone changes', async () => {
    const roundDate = todayInCoupleTz();
    const roundId = seedDailyQuestionRound(coupleId, roundDate);
    seedAnswer(roundId, partnerA.userId, 'Answer from A');
    seedAnswer(roundId, partnerB.userId, 'Answer from B');

    const result = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: 'America/New_York',
    });
    expect(result.error).toBeNull();
    expect(roundExists(roundId)).toBe(true);
  });

  it('reconcile deletes a live-window round once only one answerer is active', async () => {
    const roundDate = todayInCoupleTz();
    const roundId = seedDailyQuestionRound(coupleId, roundDate);
    seedAnswer(roundId, partnerA.userId, 'Answer from A');
    seedAnswer(roundId, partnerB.userId, 'Answer from B');
    deactivateMembership(partnerB.userId);

    const result = await partnerA.client.rpc('update_couple_timezone', {
      target_couple_id: coupleId,
      target_timezone: 'America/New_York',
    });
    expect(result.error).toBeNull();
    expect(roundExists(roundId)).toBe(false);
  });
});
