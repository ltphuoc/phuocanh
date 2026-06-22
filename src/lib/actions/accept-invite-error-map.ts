import type { ActionMessageKey } from '@/lib/actions/action-state';

// Maps an accept_couple_invite RPC error message to a user-facing action message key.
// Lives in its own pure module (not the 'use server' action file, which may only
// export async functions) so the mapping can be unit tested directly.
export const mapAcceptInviteError = (message: string): ActionMessageKey => {
  if (message.includes('INVITE_ALREADY_MEMBER')) {
    return 'auth.invite.alreadyMember';
  }

  if (message.includes('INVITE_EMAIL_MISMATCH')) {
    return 'auth.invite.emailMismatch';
  }

  if (message.includes('INVITE_NOT_FOUND')) {
    return 'auth.invite.invalidOrUsed';
  }

  if (message.includes('INVITE_EXPIRED')) {
    return 'auth.invite.expired';
  }

  if (message.includes('COUPLE_FULL')) {
    return 'auth.invite.coupleFull';
  }

  if (message.includes('AUTH_REQUIRED')) {
    return 'auth.signInRequired';
  }

  return 'unexpectedError';
};
