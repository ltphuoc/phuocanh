import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple, seedUnusedInvite } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const fetchInviteState = (token: string): { acceptedAtNull: boolean; acceptedByNull: boolean } => {
  const result = runSql(
    `select accepted_at is null, accepted_by_user_id is null ` +
      `from public.couple_invites where token = ${lit(token)};`,
  );
  const [acceptedAtNull, acceptedByNull] = result.split('|');

  return {
    acceptedAtNull: acceptedAtNull === 't',
    acceptedByNull: acceptedByNull === 't',
  };
};

const fetchActiveRole = (userId: string): string | null => {
  const result = runSql(
    `select role from public.couple_memberships ` +
      `where user_id = ${lit(userId)} and status = 'active';`,
  );

  return result === '' ? null : result;
};

describe('accept_couple_invite self-burn guard', () => {
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

  it('does not burn the token when the creator opens their own unused invite, and partner B can still join', async () => {
    const partnerA = await createSignedInMember(admin, `creator-${randomUUID()}@example.test`);
    const coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    const token = seedUnusedInvite(coupleId, partnerA.userId);

    // Creator (already an active member) opens their own link.
    const { error: creatorError } = await partnerA.client.rpc('accept_couple_invite', {
      invite_token: token,
    });

    // Surfaces the distinct signal without consuming the token.
    expect(creatorError?.message).toContain('INVITE_ALREADY_MEMBER');
    expect(fetchInviteState(token)).toEqual({ acceptedAtNull: true, acceptedByNull: true });

    // A genuine new joiner can still use the same token and becomes partner_b.
    const partnerB = await createSignedInMember(admin, `joiner-${randomUUID()}@example.test`);
    const { error: joinerError } = await partnerB.client.rpc('accept_couple_invite', {
      invite_token: token,
    });

    expect(joinerError).toBeNull();
    expect(fetchActiveRole(partnerB.userId)).toBe('partner_b');
    expect(fetchInviteState(token)).toEqual({ acceptedAtNull: false, acceptedByNull: false });

    // Documents the unchanged behaviour: re-accepting an already-used token is
    // INVITE_NOT_FOUND (the opening `accepted_at is null` filter excludes it).
    const { error: reAcceptError } = await partnerB.client.rpc('accept_couple_invite', {
      invite_token: token,
    });
    expect(reAcceptError?.message).toContain('INVITE_NOT_FOUND');
  });
});
