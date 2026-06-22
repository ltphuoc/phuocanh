import { describe, expect, it } from 'vitest';

import { mapAcceptInviteError } from '@/lib/actions/accept-invite-error-map';

describe('mapAcceptInviteError', () => {
  it('maps the COUPLE_FULL collision signal to the friendly couple-full key', () => {
    expect(mapAcceptInviteError('COUPLE_FULL')).toBe('auth.invite.coupleFull');
  });

  it('still maps COUPLE_FULL when embedded in a fuller error string', () => {
    expect(mapAcceptInviteError('ERROR: COUPLE_FULL (raised from accept_couple_invite)')).toBe(
      'auth.invite.coupleFull',
    );
  });

  it('maps each known invite signal', () => {
    expect(mapAcceptInviteError('INVITE_ALREADY_MEMBER')).toBe('auth.invite.alreadyMember');
    expect(mapAcceptInviteError('INVITE_NOT_FOUND')).toBe('auth.invite.invalidOrUsed');
    expect(mapAcceptInviteError('INVITE_EXPIRED')).toBe('auth.invite.expired');
    expect(mapAcceptInviteError('INVITE_EMAIL_MISMATCH')).toBe('auth.invite.emailMismatch');
    expect(mapAcceptInviteError('AUTH_REQUIRED')).toBe('auth.signInRequired');
  });

  it('maps INVITE_EMAIL_MISMATCH when embedded in a fuller error string', () => {
    expect(mapAcceptInviteError('ERROR: INVITE_EMAIL_MISMATCH (accept_couple_invite)')).toBe(
      'auth.invite.emailMismatch',
    );
  });

  it('falls back to unexpectedError for an unrecognized message', () => {
    expect(mapAcceptInviteError('connection reset')).toBe('unexpectedError');
  });
});
