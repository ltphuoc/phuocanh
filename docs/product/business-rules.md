# Business Rules

This file is the canonical business-rule reference for the current app. If this file and code disagree, SQL migrations win for schema/security behavior.

## Global Invariants
- The product is a single private couple space for exactly two users.
- The database currently enforces a global singleton couple space via a unique expression index on `public.couples ((true))`.
- A couple can have at most two active memberships.
- Each active role is unique within a couple: only one active `partner_a` and one active `partner_b`.
- Membership and invite safety rules are enforced in SQL, not just in UI or Server Actions.

## Membership Roles And States
- Roles are `partner_a` and `partner_b`.
- Membership status values are `active` and `inactive`.
- The current app only creates `active` memberships. There is no UI flow for deactivation yet.
- The first successful bootstrap always creates `partner_a`.
- Later invite acceptance assigns the missing active role in the couple.
- If the invite target user is already an active member of that couple, invite acceptance returns the existing role and marks the invite accepted.

## Couple Bootstrap Rules
- Bootstrap is only allowed through the `bootstrap_first_couple(started_date, couple_name)` RPC.
- The RPC uses a transaction-level advisory lock to prevent concurrent creation of duplicate couple spaces.
- If no couple exists, the authenticated user becomes `partner_a` in the new singleton couple.
- If a couple already exists and the authenticated user is already an active member, bootstrap returns the existing couple context.
- If a couple already exists and the authenticated user is not a member, bootstrap must not attach them implicitly. They must join through an invite.

## Couple Timezone
- The couple owns one shared timezone stored on `couples.timezone`.
- The current default and backfill timezone is `Asia/Ho_Chi_Minh`.
- The timezone must be a valid IANA timezone name and is validated in SQL.
- Timezone changes are allowed only through the `update_couple_timezone(...)` RPC.
- Changing the couple timezone preserves the visible calendar date for existing countdowns and future notes by rewriting their stored UTC instants.
- Changing the couple timezone does not rewrite memory timestamps.
- Couple-level day-boundary features use the saved timezone, including:
  - relationship-day math
  - on-this-day lookup
  - countdown labels
  - future-note unlock dates
  - trip status
  - album media eligibility

## Invite Lifecycle
- Invites are created by an active couple member through `createInviteAction`.
- Invite tokens are UUIDs and expire 14 days after creation.
- Invite acceptance is only allowed through the `accept_couple_invite(invite_token)` RPC.
- Only unused invites (`accepted_at is null`) can be accepted.
- Expired invites fail.
- If the couple already has two active members, invite acceptance fails with `COUPLE_FULL`.
- Successful invite acceptance creates an active membership, records `accepted_at`, and records `accepted_by_user_id`.

## Memory And Media Rules
- A memory currently requires either:
  - a non-empty note, or
  - one uploaded media file
- The current UI supports at most one uploaded file per memory submission, even though the data model allows multiple media rows per memory.
- Supported media types are images and videos only.
- The app-level upload limit is `25MB`.
- Memory media is stored in the private `memory-media` bucket.
- Storage object names must follow the contract `couples/{coupleId}/memories/{memoryId}/{timestamp}-{safeFileName}`.
- If media upload or media metadata insert fails, the app attempts rollback so partial storage/database state is not left behind.

## Lists And Checklists
- Wish items are couple-scoped and member-visible through RLS.
- Checklists are couple-scoped and member-visible through RLS.
- Checklist item writes are authorized through the parent checklist’s couple membership in SQL.
- Checklist item actions do not need to fetch the couple context explicitly because RLS enforces the parent checklist relationship.

## Countdowns
- Countdown kinds are `anniversary`, `birthday`, `travel`, `plan`, and `custom`.
- Countdowns are couple-scoped and readable by active couple members only.
- Countdown creation records the creating member in `created_by_user_id` and is authorized by RLS.
- Countdown dates are stored as UTC timestamps derived from the selected local date in the saved couple timezone.
- Past countdowns remain visible as history; the current slice does not auto-archive or auto-delete them.
- Reminder automation and background jobs are explicitly deferred.

## Future Notes
- Future-note metadata (`title`, `unlock_at`) is visible immediately to active couple members.
- Future-note bodies are stored in a separate one-to-one table (`future_note_contents`).
- Future-note bodies are unreadable until the parent note satisfies `unlock_at <= now()` in SQL policy.
- `unlock_at` is stored as a UTC instant derived from the selected local date in the saved couple timezone.
- Creation is a two-step mutation: metadata first, content second. If content insert fails, the app attempts rollback of the metadata row.
- The current slice has no edit/delete UI and no reminder-delivery workflow.
- This slice uses database policy gating, not encryption-at-rest.

## Trips
- Trips are couple-scoped and readable by active couple members only.
- Trip creation records the creating member in `created_by_user_id` and is authorized by RLS.
- Trip dates are stored as date-only fields (`start_date`, `end_date`), not timestamps.
- Trip status is derived in app code as `planned`, `active`, or `completed` from the saved couple timezone day token and the stored date range.
- The database enforces `end_date >= start_date`.
- This slice has no edit/delete flow.

## Albums
- Albums are couple-scoped and readable by active couple members only.
- Albums are rooted in `trips`, not in a separate travel hierarchy.
- Slice 3 enforces one album per trip through a unique `albums.trip_id` constraint.
- Albums reuse existing `memory_media`; they do not create a second upload pipeline or a second storage bucket.
- Album creation records the creating member in `created_by_user_id` and is authorized through RLS plus the `create_album_with_items(...)` RPC.
- Creating an album requires at least one selected media item.
- Eligible album media is derived from couple-owned `memory_media` whose parent memory’s local date in the saved couple timezone falls within the trip’s `start_date..end_date` window.
- Adding media later is allowed, but only for remaining eligible media not already attached to the album.
- This slice has no captions, reordering, removal, delete flow, or multi-album-per-trip behavior.

## Visited Places
- Visited places are couple-scoped and readable by active couple members only.
- Visited places are rooted in `trips`, not in a separate travel hierarchy.
- Visited-place creation records the creating member in `created_by_user_id` and is authorized by RLS.
- `visited_on` is stored as a date-only field and must stay within the parent trip’s `start_date..end_date` window.
- The current atlas is provider-free: it stores no coordinates, route polylines, or tile-provider metadata.
- This slice has no edit/delete flow, geocoding flow, or memory-location auto-derivation.

## Forbidden States
- More than one `couples` row
- More than two active memberships in a couple
- Two active `partner_a` memberships in one couple
- Two active `partner_b` memberships in one couple
- Direct app-layer join flow that writes `couples` or `couple_memberships` without RPCs
- Storage objects in `memory-media` whose path does not begin with `couples/{uuid}/...`
- Future-note body visibility before the parent note unlock date
- Trip row whose `end_date` is before `start_date`
- More than one album for the same trip in the current contract
- Album row committed without at least one `album_items` row
- Duplicate `album_items` rows for the same `(album_id, memory_media_id)` pair
- Visited-place row whose `visited_on` falls outside the parent trip window

## Enforcement Map
- Singleton couple space: SQL unique index
- Max two active members: SQL trigger
- Unique active roles: SQL partial unique index
- Direct membership/couple creation from app layer: blocked by RLS and replaced by RPCs
- Invite validity, expiration, and role assignment: SQL RPC
- Couple membership read/write visibility: RLS helper `is_couple_member(...)`
- Storage object access: storage policies using the couple ID embedded in the object path
- Countdown and future-note visibility: RLS on the Phase 2 tables
- Future-note body unlock rule: `future_note_contents_select` policy joined against `future_notes.unlock_at`
- Couple timezone validity: `couples_timezone_valid_check` using `is_valid_timezone(...)`
- Couple timezone mutation: `update_couple_timezone(...)`
- Trip visibility and inserts: RLS on `trips`
- Trip date validity: `trips_date_range_check` constraint
- Album visibility and direct insert bounds: RLS on `albums` and `album_items`
- Trip-album uniqueness: `albums.trip_id` unique constraint
- Album-without-items prevention: deferred `albums_require_items_trigger`
- Album-item uniqueness: `album_items_album_media_unique` constraint
- Multi-row album writes and eligibility enforcement: `create_album_with_items(...)` and `add_album_items(...)` RPCs
- Visited-place visibility and inserts: RLS on `visited_places`
- Visited-place trip-window validity: `visited_places_insert` policy joined against `trips.start_date` and `trips.end_date`

## User-Visible Failure States
- Login can fail if Supabase Auth is unreachable.
- Invite acceptance can fail with:
  - invalid or already used invite
  - expired invite
  - couple already full
  - not signed in
- Memory create can fail if:
  - note and media are both empty
  - file is larger than `25MB`
  - file is not an image or video
  - upload, media metadata insert, or later writes fail
- Countdown, future-note, and trip create can fail if:
  - required fields are missing or invalid
  - the authenticated user lacks active couple membership
  - database writes fail unexpectedly
- Visited-place create can fail if:
  - required fields are missing or invalid
  - the trip is missing or outside the member’s couple scope
  - `visited_on` falls outside the trip window
  - database writes fail unexpectedly
- Album create/add can fail if:
  - no media items are selected
  - the selected media IDs are duplicated in the submission
  - the trip or album is missing or outside the member’s couple scope
  - the trip already has an album
  - selected media does not belong to the couple or falls outside the trip window
  - database writes fail unexpectedly

## Current Shell Boundaries
- `/chat` is mock-only because it renders sample conversation content.
- `/games`, `/games/[mode]`, and `/stats` are shell-only.
- Shell-only and mock-only routes must not be treated as proof that backend tables, jobs, or APIs exist.
