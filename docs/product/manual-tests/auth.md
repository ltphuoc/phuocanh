# Auth Manual Tests

## Feature Summary

- Covers guest redirect, magic-link sign-in, first-user onboarding, invite generation, and second-user invite join.

## Routes Covered

- `/`
- `/login`
- `/onboarding`
- `/accept-invite`
- `/auth/callback`

## Preconditions

- Local Supabase, Mailpit, and the app are running.
- Use debug token format `DBG-AUTH-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data

- Two reachable test email addresses.
- Put the debug token in the couple name during onboarding.

## Core Smoke Cases

### MAN-AUTH-001 First user can sign in and complete onboarding

1. Open `/`.
2. Confirm the app redirects to `/login`.
3. Send a magic link to the first email.
4. Open the email, follow the callback flow, and complete onboarding using a couple name containing the debug token.
5. Land on `/home`.

Expected result:

- Login succeeds, onboarding completes once, and `/home` loads for the first partner.

Failure triage:

- Route: `/login`, `/onboarding`, `/auth/callback`
- Action: `sendMagicLinkAction`, `completeOnboardingAction`
- Read helper: `getAuthGateState()`
- RPC: `bootstrap_first_couple(...)`, `has_any_couple()`

### MAN-AUTH-002 Second user can join with invite

1. From `/home`, generate a partner invite.
2. Open the invite URL in a fresh session.
3. Confirm the app redirects to `/login` while preserving `next=/accept-invite?token=...`.
4. Sign in with the second email.
5. Open the email link from Mailpit and confirm it returns to `/accept-invite?token=...`.
6. Join the couple space from `/accept-invite`.
7. Confirm the second user lands on `/home`.

Expected result:

- Invite URL resolves, acceptance succeeds once, and the second user becomes an active member.

Failure triage:

- Route: `/accept-invite`
- Action: `createInviteAction`, `acceptInviteAction`
- Read helper: `getAuthGateState()`
- RPC: `accept_couple_invite(...)`

## Automated Coverage

- `E2E-AUTH-SETUP-000`
- `E2E-AUTH-001`
- `E2E-AUTH-002`
- `E2E-AUTH-003`
- `E2E-AUTH-004`
