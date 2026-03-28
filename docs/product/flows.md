# Product Flows

This file describes the current runtime flows. It is intended to answer “what actually happens” before an agent reads code.

## Flow 1: Login With Magic Link
Preconditions:
- User is not authenticated.
- User knows the email tied to the couple space.

Steps:
1. User opens `/login`.
2. `sendMagicLinkAction` validates the email and requests a Supabase magic link.
3. The action builds `emailRedirectTo=/auth/callback?next=/home`.
4. In local development the action retries both `localhost` and `127.0.0.1` Supabase hosts before surfacing a network error.
5. User follows the email link back into `/auth/callback`.
6. `/auth/callback` exchanges either `code` via `exchangeCodeForSession(...)` or `token_hash` + `type` via `verifyOtp(...)`.
7. Callback redirects to a normalized internal `next` path, default `/home`.

Redirects:
- `/` redirects unauthenticated users to `/login`.
- `/auth/callback` falls back to `/login` on invalid or failed callback exchange.

User-visible errors:
- Invalid email
- Supabase Auth not reachable
- Generic auth callback failure returns to login

## Flow 2: First User Bootstrap
Preconditions:
- User is authenticated.
- No active membership exists for that user.
- No couple space exists yet.

Steps:
1. Authenticated route or `/` calls `getAuthGateState()`.
2. App checks for an active `couple_memberships` row for the user.
3. If none exists, app calls `bootstrap_first_couple(...)`.
4. RPC creates the singleton couple and one active membership as `partner_a`.
5. App returns `ready` state and renders `/home`.

Redirects:
- `/` redirects to `/home` once the couple context is ready.

User-visible errors:
- Missing schema surfaces the setup-recovery UI.
- RPC failure bubbles as runtime error.

## Flow 3: Authenticated User Needs Invite
Preconditions:
- User is authenticated.
- No active membership exists for that user.
- A couple space already exists.

Steps:
1. `getAuthGateState()` checks membership.
2. App attempts bootstrap.
3. Bootstrap RPC returns `COUPLE_EXISTS`.
4. App resolves auth gate state as `needs_invite`.
5. Authenticated app routes redirect the user to `/accept-invite`.

Redirects:
- `/` redirects to `/accept-invite`.
- Authenticated app layout redirects to `/accept-invite`.

User-visible errors:
- None in the redirect itself; user must provide a valid invite token next.

## Flow 4: Generate Invite For The Second User
Preconditions:
- Current user is an active member of the couple.

Steps:
1. User triggers `createInviteAction`.
2. Action creates a UUID token and expiry 14 days in the future.
3. Action inserts a `couple_invites` row for the current couple.
4. Action returns a fully-qualified `/accept-invite?token=...` URL.
5. UI allows copying the invite URL to the clipboard.

Redirects:
- None.

User-visible errors:
- Insert failure from Supabase

## Flow 5: Accept Invite As The Second User
Preconditions:
- User is authenticated.
- User has the full invite URL or token.
- User is not already fully blocked by `COUPLE_FULL`.

Steps:
1. User opens `/accept-invite?token=...`.
2. Page requires authentication; unauthenticated users are redirected to `/login`.
3. `AcceptInviteForm` submits the token to `acceptInviteAction`.
4. Action calls the `accept_couple_invite(...)` RPC.
5. RPC validates token, expiration, membership state, and available role.
6. RPC assigns the missing role, records invite acceptance, and returns the couple context.
7. UI redirects the user to `/home`.

Redirects:
- Unauthenticated user on `/accept-invite` -> `/login`
- Already-ready couple member on `/accept-invite` -> `/home`
- Successful acceptance -> `/home`

User-visible errors:
- Invite invalid or already used
- Invite expired
- Couple already full
- User must sign in first

## Flow 6: Create Memory
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/memories/new`.
2. Client form validates `happenedAtLocal`, `locationName`, and `note`.
3. Form builds `FormData` with ISO `happenedAt`, trimmed text fields, and an optional file.
4. `createMemoryAction` requires ready couple context.
5. Action rejects submissions that contain neither a note nor a file.
6. Action validates file type and `25MB` app limit.
7. Action inserts the `memories` row.
8. If a file exists, action uploads it to the `memory-media` bucket using the couple/memory path contract.
9. Action inserts the `memory_media` row.
10. Action inserts an `activity_events` row.
11. Action revalidates `/home`, `/on-this-day`, and `/lists`.
12. Client redirects to `/home` on success.

Redirects:
- Success -> `/home`

User-visible errors:
- No note and no media
- File too large
- Unsupported file type
- Upload failure
- Media metadata write failure
- Later DB/storage error

## Flow 7: Add Wish Item
Preconditions:
- User is in `ready` couple context.

Steps:
1. User submits category, title, and optional note.
2. `addWishItemAction` validates and inserts a couple-scoped `wish_items` row.
3. Action revalidates `/home` and `/lists`.

User-visible errors:
- Validation failure
- Insert failure

## Flow 8: Create Checklist, Add Item, Toggle Item
Preconditions:
- User is a couple member.

Steps:
1. `createChecklistAction` creates a couple-scoped checklist and revalidates `/home` and `/lists`.
2. `addChecklistItemAction` adds an item to a checklist by `checklistId`.
3. `toggleChecklistItemAction` updates `is_done` and `done_at` by checklist item ID.
4. Checklist item authorization is enforced in SQL through the parent checklist relationship.

Redirects:
- None.

User-visible errors:
- Validation failure
- Insert/update failure

## Route Entry Flow
- `/` is a pure redirect route.
- Unauthenticated -> `/login`
- Authenticated but not invited/bootstrap-ready -> `/accept-invite`
- Ready couple member -> `/home`
