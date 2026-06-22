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

// Seeds an invite bound to a specific partner email via the privileged connection.
const seedBoundInvite = (
  coupleId: string,
  invitedByUserId: string,
  invitedEmail: string,
  { expiresInterval = "interval '14 days'" }: { expiresInterval?: string } = {},
): string => {
  const token = randomUUID();
  runSql(
    `insert into public.couple_invites ` +
      `(couple_id, token, invited_by_user_id, invited_email, expires_at) values (` +
      `${lit(coupleId)}, ${lit(token)}, ${lit(invitedByUserId)}, ${lit(invitedEmail)}, ` +
      `now() + ${expiresInterval});`,
  );
  return token;
};

const inviteAcceptedAtIsNull = (token: string): boolean =>
  runSql(`select accepted_at is null from public.couple_invites where token = ${lit(token)};`) ===
  't';

describe('accept_couple_invite email binding', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `creator-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
  });

  afterAll(() => {
    resetCoupleData();
  });

  it('rejects an accepter whose email differs from the bound invite, leaving it unconsumed', async () => {
    const token = seedBoundInvite(coupleId, partnerA.userId, 'partner@example.test');
    const stranger = await createSignedInMember(admin, `stranger-${randomUUID()}@example.test`);

    const { error } = await stranger.client.rpc('accept_couple_invite', { invite_token: token });

    expect(error?.message).toContain('INVITE_EMAIL_MISMATCH');
    expect(inviteAcceptedAtIsNull(token)).toBe(true);
  });

  it('accepts a matching email case- and whitespace-insensitively', async () => {
    // Stored value is intentionally un-normalized to prove the RPC lowercases/trims both sides.
    const token = seedBoundInvite(coupleId, partnerA.userId, '  Partner.Match@Example.test ');
    const partnerB = await createSignedInMember(admin, 'partner.match@example.test');

    const { error } = await partnerB.client.rpc('accept_couple_invite', { invite_token: token });

    expect(error).toBeNull();
    expect(inviteAcceptedAtIsNull(token)).toBe(false);
    expect(
      runSql(
        `select role from public.couple_memberships where user_id = ${lit(partnerB.userId)} and status = 'active';`,
      ),
    ).toBe('partner_b');
  });

  it('reports MISMATCH before COUPLE_FULL so a wrong-email stranger cannot learn occupancy', async () => {
    const partnerB = await createSignedInMember(admin, `joiner-${randomUUID()}@example.test`);
    await addSecondMember(coupleId, partnerA, partnerB);

    // Couple is now full; a fresh invite is bound to a third email.
    const token = seedBoundInvite(coupleId, partnerA.userId, 'invited-third@example.test');
    const stranger = await createSignedInMember(admin, `wrong-${randomUUID()}@example.test`);

    const { error } = await stranger.client.rpc('accept_couple_invite', { invite_token: token });

    expect(error?.message).toContain('INVITE_EMAIL_MISMATCH');
    expect(error?.message).not.toContain('COUPLE_FULL');
  });

  it('expires outstanding unbound invites via the cutover predicate', async () => {
    // A pre-binding invite (no invited_email) seeded with a future expiry...
    const token = randomUUID();
    runSql(
      `insert into public.couple_invites (couple_id, token, invited_by_user_id, expires_at) ` +
        `values (${lit(coupleId)}, ${lit(token)}, ${lit(partnerA.userId)}, now() + interval '14 days');`,
    );

    // ...is force-expired by the same predicate the migration's cutover applies.
    runSql(
      `update public.couple_invites set expires_at = now() ` +
        `where accepted_at is null and invited_email is null;`,
    );

    const accepter = await createSignedInMember(admin, `late-${randomUUID()}@example.test`);
    const { error } = await accepter.client.rpc('accept_couple_invite', { invite_token: token });

    expect(error?.message).toContain('INVITE_EXPIRED');
  });
});
