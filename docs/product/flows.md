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

## Flow 9: Create Countdown
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/countdowns`.
2. `CreateCountdownForm` validates `title`, `kind`, `targetDate`, and optional `note`.
3. Form submits the selected date as a date-only value in `FormData`.
4. `createCountdownAction` requires ready couple context.
5. Action validates the payload with `createCountdownSchema`.
6. Action converts `targetDate` into the stored UTC instant at local midnight in the saved couple timezone.
7. Action inserts a couple-scoped `countdowns` row with `created_by_user_id`.
8. Action revalidates `/countdowns`.
9. UI stays on the page and surfaces success through the shared `ActionState` + toast pattern.

Redirects:
- None.

User-visible errors:
- Missing or invalid title/date/kind
- Missing active couple membership
- Unexpected database write failure

## Flow 10: Create Future Note
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/future-notes`.
2. `CreateFutureNoteForm` validates `title`, `unlockDate`, and `body`.
3. Form submits the selected unlock date as a date-only value in `FormData`.
4. `createFutureNoteAction` requires ready couple context.
5. Action validates the payload with `createFutureNoteSchema`.
6. Action converts `unlockDate` into the stored UTC instant at local midnight in the saved couple timezone.
7. Action inserts the `future_notes` metadata row first.
8. Action inserts the `future_note_contents` body row second.
9. If the body insert fails, the action attempts rollback of the metadata row.
10. Action revalidates `/future-notes`.
11. UI stays on the page and surfaces success through the shared `ActionState` + toast pattern.

Redirects:
- None.

User-visible errors:
- Missing or invalid title/body/unlock date
- Missing active couple membership
- Metadata or content write failure

## Flow 11: Read Locked And Unlocked Future Notes
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/future-notes`.
2. Server route resolves couple context and calls `getFutureNotesPageData(...)`.
3. The helper reads couple-scoped `future_notes` metadata ordered by `unlock_at`.
4. Notes with `unlock_at > now()` are returned as locked metadata only.
5. Notes with `unlock_at <= now()` are treated as unlocked.
6. Only unlocked note IDs are then used to read `future_note_contents`.
7. UI renders locked notes without bodies and unlocked notes with bodies.

Redirects:
- Invalid auth/couple state follows the normal app auth gate redirect rules.

User-visible errors:
- Generic route failure if metadata or unlocked-content reads fail unexpectedly

## Flow 12: Create Trip
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/trips`.
2. `CreateTripForm` validates `title`, `startDate`, `endDate`, and optional `note`.
3. Form submits date-only values through `FormData`.
4. `createTripAction` requires ready couple context.
5. Action validates the payload with `createTripSchema`, including `endDate >= startDate`.
6. Action inserts a couple-scoped `trips` row with `created_by_user_id`.
7. Action revalidates `/trips`.
8. UI stays on the page and surfaces success through the shared `ActionState` + toast pattern.

Redirects:
- None.

User-visible errors:
- Missing or invalid title/date range
- End date before start date
- Missing active couple membership
- Unexpected database write failure

## Flow 13: Create Album From Trip Detail
Preconditions:
- User is in `ready` couple context.
- User opens a real trip detail route: `/trips/[tripId]`.
- The trip has no linked album yet.
- The trip has eligible `memory_media` whose parent memory `happened_at` falls inside the trip window.

Steps:
1. Server route resolves couple context and calls `getTripDetailData(...)`.
2. The helper reads the trip, checks for an existing album, reads in-range memories, reads eligible `memory_media`, signs media URLs, and returns remaining candidates.
3. `CreateAlbumForm` validates `title`, optional `description`, and selected `memoryMediaIds`.
4. `createAlbumAction` requires ready couple context and validates the payload.
5. Action calls `create_album_with_items(...)`.
6. RPC enforces:
   - one album per trip
   - active couple membership
   - no duplicate submitted media IDs
   - selected media belongs to the couple
   - selected media falls inside the trip window
7. RPC creates the `albums` row and initial `album_items` transactionally.
8. Action revalidates `/albums` and `/trips/[tripId]`.
9. Trip detail re-renders into the linked-album state.

Redirects:
- Invalid or foreign trip IDs return `notFound()` before the form is available.

User-visible errors:
- Missing title
- No media selected
- Duplicate or invalid media selection
- Trip not found
- Trip already has an album
- Unexpected RPC/database failure

## Flow 14: Add More Media To An Existing Album
Preconditions:
- User is in `ready` couple context.
- User opens a real trip detail route: `/trips/[tripId]`.
- The trip already has a linked album.
- Remaining eligible media still exists for that album/trip window.

Steps:
1. Server route resolves couple context and calls `getTripDetailData(...)`.
2. The helper returns the linked album summary plus only the eligible media not already attached.
3. `AddAlbumItemsForm` validates the selected `memoryMediaIds`.
4. `addAlbumItemsAction` requires ready couple context and validates the payload.
5. Action calls `add_album_items(...)`.
6. RPC enforces:
   - active couple membership
   - no duplicate submitted media IDs
   - album exists inside the member’s couple scope
   - selected media belongs to the couple
   - selected media falls inside the linked trip window
   - selected media is not already attached
7. RPC appends new `album_items` rows with new `position` values.
8. Action revalidates `/albums`, `/albums/[albumId]`, and `/trips/[tripId]`.
9. Trip detail and album detail re-render with the new media set.

Redirects:
- Invalid or foreign trip IDs return `notFound()` before the add form is available.

User-visible errors:
- No media selected
- Duplicate or invalid media selection
- Album not found
- Unexpected RPC/database failure

## Flow 15: Create Visited Place From Trip Detail
Preconditions:
- User is in `ready` couple context.
- User opens a real trip detail route: `/trips/[tripId]`.

Steps:
1. Server route resolves couple context and calls `getTripDetailData(...)`.
2. The helper reads the trip and its existing `visited_places` rows ordered by `visited_on`, then `created_at`.
3. `CreateVisitedPlaceForm` validates `title`, `visitedOn`, and optional `note`.
4. `createVisitedPlaceAction` requires ready couple context and validates the payload.
5. Action re-reads the trip inside the current couple scope.
6. Action rejects submissions whose `visitedOn` falls outside the trip window.
7. Action inserts the couple-scoped `visited_places` row with `created_by_user_id`.
8. Action revalidates `/map` and `/trips/[tripId]`.
9. Trip detail and `/map` re-render with the new place.

Redirects:
- Invalid or foreign trip IDs return `notFound()` before the form is available.

User-visible errors:
- Missing or invalid title/date
- Trip not found
- `visitedOn` outside the trip window
- Unexpected database write failure

## Flow 16: Read Provider-Free Atlas Map
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/map`.
2. Server route resolves couple context and calls `getMapPageData(...)`.
3. The helper reads couple-scoped `visited_places` ordered by newest `visited_on`, then `created_at`.
4. The helper reads only the trips referenced by those places and maps them into grouped atlas sections.
5. UI renders the provider-free atlas with:
   - selectable visited-place detail
   - trip-grouped navigation
   - empty state when there are no visited places yet

Redirects:
- Invalid auth/couple state follows the normal app auth gate redirect rules.

User-visible errors:
- Generic route failure if the map read fails unexpectedly

## Flow 17: Update Couple Timezone
Preconditions:
- User is in `ready` couple context.

Steps:
1. User opens `/settings`.
2. Server route resolves couple context and renders the current `couples.timezone` value.
3. `UpdateCoupleTimezoneForm` validates `timeZone` against the supported IANA timezone list.
4. `updateCoupleTimezoneAction` requires ready couple context and validates the payload.
5. Action calls `update_couple_timezone(...)`.
6. RPC validates active membership and timezone validity.
7. RPC rewrites existing countdown and future-note instants so they keep the same visible calendar date in the new timezone.
8. RPC updates `couples.timezone`.
9. Action revalidates `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, and `/map`.
10. The affected routes re-render against the new couple timezone.

Redirects:
- Invalid auth/couple state follows the normal app auth gate redirect rules.

User-visible errors:
- Missing or invalid timezone
- Missing active couple membership
- Unexpected RPC/database failure

## Route Entry Flow
- `/` is a pure redirect route.
- Unauthenticated -> `/login`
- Authenticated but not invited/bootstrap-ready -> `/accept-invite`
- Ready couple member -> `/home`
