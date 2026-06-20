import type { TestMember } from './supabase-clients';

import { randomUUID } from 'node:crypto';

import { runSql } from './supabase-clients';

// Helpers that build couple state through the real RPC path (bootstrap_first_couple
// / accept_couple_invite) so tests exercise genuine auth + RLS rather than direct
// table writes. Only the unused invite row is seeded with the privileged psql
// connection; the membership-creating accept is a real authenticated RPC call.
// The single-couple invariant means only one couple may exist at a time, so
// callers must reset between tests (see resetCoupleData).

const sqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

interface BootstrapCoupleOptions {
  readonly startedDate?: string;
  readonly coupleName?: string;
  readonly timezone: string;
}

// Bootstraps the one couple as partner A and returns its id.
export const bootstrapCouple = async (
  partnerA: TestMember,
  {
    startedDate = '2024-01-01',
    coupleName = 'Integration Couple',
    timezone,
  }: BootstrapCoupleOptions,
): Promise<string> => {
  const { data, error } = await partnerA.client.rpc('bootstrap_first_couple', {
    started_date: startedDate,
    couple_name: coupleName,
    target_timezone: timezone,
  });

  if (error) {
    throw new Error(`bootstrap_first_couple failed: ${error.message}`);
  }

  const coupleId = data?.[0]?.couple_id;
  if (!coupleId) {
    throw new Error('bootstrap_first_couple returned no couple id');
  }

  return coupleId as string;
};

// Seeds an unused invite (created by partner A) via the privileged connection and
// returns its token. Used both to add a second member and to exercise the
// self-burn guard.
export const seedUnusedInvite = (coupleId: string, invitedByUserId: string): string => {
  const token = randomUUID();

  runSql(
    `insert into public.couple_invites (couple_id, token, invited_by_user_id, expires_at) ` +
      `values (${sqlLiteral(coupleId)}, ${sqlLiteral(token)}, ${sqlLiteral(invitedByUserId)}, now() + interval '14 days');`,
  );

  return token;
};

// Seeds an unused invite from partner A, then has partner B accept it through the
// real RPC so they join as the second member. Returns the invite token.
export const addSecondMember = async (
  coupleId: string,
  partnerA: TestMember,
  partnerB: TestMember,
): Promise<string> => {
  const token = seedUnusedInvite(coupleId, partnerA.userId);

  const { error: acceptError } = await partnerB.client.rpc('accept_couple_invite', {
    invite_token: token,
  });

  if (acceptError) {
    throw new Error(`accept_couple_invite failed for partner B: ${acceptError.message}`);
  }

  return token;
};
