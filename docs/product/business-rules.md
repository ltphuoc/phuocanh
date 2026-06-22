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
- If the caller is already an active member of that couple, an unused invite is left intact and acceptance raises `INVITE_ALREADY_MEMBER` without consuming the token (see Invite Lifecycle).
- Membership updates are scoped to the caller's own row; a member cannot modify their partner's membership status or attributes.

## Couple Bootstrap Rules

- Bootstrap is only allowed through the `bootstrap_first_couple(started_date, couple_name, target_timezone)` RPC.
- Auth-gate reads must not create bootstrap data implicitly.
- First-user onboarding must collect draft values step by step and show a final confirmation summary before calling bootstrap.
- The RPC uses a transaction-level advisory lock to prevent concurrent creation of duplicate couple spaces.
- If no couple exists, the authenticated user becomes `partner_a` in the new singleton couple.
- If a couple already exists and the authenticated user is already an active member, bootstrap returns the existing couple context.
- If a couple already exists and the authenticated user is not a member, bootstrap must not attach them implicitly. They must join through an invite.

## Couple Timezone

- The couple owns one shared timezone stored on `couples.timezone`.
- The current default and backfill timezone is `Asia/Ho_Chi_Minh`.
- The timezone must be a valid IANA timezone name and is validated in SQL.
- Timezone changes are allowed **only** through the `update_couple_timezone(...)` RPC. Direct `UPDATE` statements from app code are blocked by a trigger to prevent desync of reminder due-dates.
- Changing the couple timezone preserves the visible calendar date for existing countdowns and future notes by rewriting their stored UTC instants.
- Changing the couple timezone does not rewrite memory timestamps.
- Changing the couple timezone reconciles in-flight game rounds inside the same RPC transaction: rounds dated today-or-future under the old zone that are not yet revealed (per each mode's reveal threshold) are deleted, so the next open regenerates a single canonical round under the new zone instead of stranding the old one. Already-revealed rounds — including a solo `guess_date`/`trivia` round at a single answer — and all past rounds are preserved. Child answer/target rows drop via cascade.
- Because that reconciliation is destructive, the settings UI requires an explicit confirmation before submitting a _changed_ zone (an unchanged zone saves straight through; cancel is non-destructive). The warning is unconditional rather than a live count, to avoid duplicating the RPC's delete predicate or leaking hidden gameplay state.
- Couple-level day-boundary features use the saved timezone, including:
  - relationship-day math
  - on-this-day lookup
  - countdown labels
  - future-note unlock dates
  - trip status
  - album media eligibility

## Invite Lifecycle

- Invites are created by an active couple member through `createInviteAction`, which requires the partner's email and stores it normalized (`lower(btrim(...))`) as `invited_email`.
- Invite tokens are UUIDs and expire 14 days after creation.
- Invite acceptance is only allowed through the `accept_couple_invite(invite_token)` RPC.
- Only unused invites (`accepted_at is null`) can be accepted.
- Expired invites fail.
- An invite is bound to its `invited_email`: acceptance succeeds only when the accepter's `auth.users` email matches it (normalized both sides; a null accepter email is also rejected for a bound invite), else it fails with `INVITE_EMAIL_MISMATCH` and the token stays unconsumed. The mismatch is checked **before** `COUPLE_FULL`, so a wrong-email stranger cannot learn whether a seat is free. The accepter email is read from `auth.users`, never caller input. (Pre-binding unbound invites were force-expired at the binding migration's cutover, so no bare-token link survives.)
- If the couple already has two active members, invite acceptance fails with `COUPLE_FULL`.
- When two valid invites are accepted concurrently, exactly one succeeds; the loser also fails with `COUPLE_FULL` — whether it collides on the active-role unique index or trips the max-two-active-members trigger, both map to `COUPLE_FULL`, never a raw or unexpected error. The couple still ends with two active members.
- If the caller is already an active member of the couple, an unused invite is not consumed: acceptance fails with `INVITE_ALREADY_MEMBER` and `accepted_at`/`accepted_by_user_id` stay null, so a creator opening their own link cannot lock out the real invitee. The app surfaces this as an informational notice, not an error.
- Re-clicking an invite that was already accepted returns `INVITE_NOT_FOUND` (the RPC only opens invites where `accepted_at is null`).
- Successful invite acceptance creates an active membership, records `accepted_at`, and records `accepted_by_user_id`.

## Couple Data Erasure

- An active member may erase the couple space through `eraseCoupleSpaceAction` → `erase_couple_space()` RPC. It is **destructive and irreversible** and is gated by a typed `DELETE` confirmation (enforced both in the UI and server-side).
- Erasure removes the couple data, **not** the auth users: it deletes the single `couples` row (and `game_rounds` first so the `ON DELETE RESTRICT` game-target → memory FKs cannot abort the cascade), which cascades the entire couple-scoped graph. Membership/erasure never writes `couples`/`couple_memberships` directly from app code.
- The action wipes the couple's `memory-media` storage objects **before** the DB delete (the object keys live in `memory_media`), so a crash leaves the path source intact and the action is safe to retry.
- After erasure the singleton invariant resets: both members keep their login and return to pre-onboarding, where the same user can immediately re-bootstrap a fresh couple. A non-member calling the RPC gets `NOT_A_MEMBER` and nothing is deleted.

## Memory And Media Rules

- A memory currently requires either:
  - a non-empty note, or
  - one uploaded media file
- This content invariant (note OR ≥1 media) is enforced atomically in the `update_memory_media()` RPC so concurrent edits cannot both succeed when emptying the memory.
- The current UI supports multiple uploaded files per memory submission.
- A memory note is capped at 4000 characters (after trim). The cap is enforced in the form Zod schema (graceful inline error) and by a `memories.note` CHECK so a direct PostgREST write cannot exceed it.
- Supported media types are images and videos only. `image/svg+xml` (and the `image/svg` alias) is explicitly denied at upload time as defense-in-depth hygiene — active SVG markup is never stored — surfaced to the user as `memory.svgNotAllowed`.
- The app-level upload limit is `25MB`.
- Memory media is stored in the private `memory-media` bucket.
- Storage object names must follow the contract `couples/{coupleId}/memories/{memoryId}/{timestamp}-{safeFileName}`.
- These media rules are also enforced at the database level by same-row CHECK constraints on `memory_media`, so a direct PostgREST write cannot bypass them: `mime_type` must be `image/*` or `video/*`, `size_bytes` must be `> 0` and `<= 26214400` (25 MiB, matching the bucket `file_size_limit`), and `storage_path` must sit under this row's `couples/{couple_id}/memories/{memory_id}/` prefix.
- The new-memory form uploads each selected file to the bucket immediately (before the memory row exists), tracking the objects so it can remove them when the user deselects a file, when the submit fails, and best-effort on unmount/navigation. A hard crash or force-closed tab can still leave a residual object; an hourly server-side sweep (`media-sweeper` edge function, driven by the `memory-media-sweeper` pg_cron job) deletes bucket objects that have no `memory_media` row and are older than a 24h cutoff. The cutoff exceeds any realistic compose session so an in-flight upload is never swept, and the sweep ships dry-run (log-only) by default until a clean cycle is observed.
- Memory creation is whole-submission atomic: media metadata is written as a single bulk insert, and if the memory row or the media insert fails the action removes every uploaded storage object and the memory row, so no partial storage/database state is left behind.
- Deleting a memory or its media propagates into albums: `memory_media` drops via `memories.on delete cascade`, `album_items` drops via `album_items.memory_media_id on delete cascade`, and the app then auto-deletes any album left with zero items through the atomic `delete_empty_albums(...)` RPC (a single guarded statement, so a partner's concurrent `add_album_items` is never lost to a stale emptiness check). This differs from trip delete, which removes trip-rooted albums but preserves independent memories.
- Memory locations may store a provider source ID, address, and coordinates alongside the display name.
- Memory edits can update note, date, location, and media through the `update_memory_media()` RPC. Deleting media or memories removes private storage objects on a best-effort basis.

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
- Countdown `title` and `note` validation is enforced in SQL as well as in the app: trimmed `title` length `1..120`, optional `note` max `280` characters.
- Past countdowns remain visible as history; the current slice does not auto-archive or auto-delete them.
- Countdowns enqueue one day-of reminder email per active partner based on the saved couple timezone.

## Future Notes

- Future-note metadata (`title`, `unlock_at`) is visible immediately to active couple members.
- Future-note bodies are stored in a separate one-to-one table (`future_note_contents`).
- Future-note bodies are encrypted at rest and are unreadable until the parent note satisfies `unlock_at <= now()` through the unlocked-body RPC.
- `unlock_at` is stored as a UTC instant derived from the selected local date in the saved couple timezone.
- Future-note title and body validation is enforced in SQL as well as in the app: trimmed non-empty title/body, title max `120`, body max `2000`.
- Creation is a transactional mutation owned by SQL so metadata insert plus encrypted content write succeed or fail together.
- Unlock reminder emails are summary-only and do not include the decrypted note body.
- The current slice has no edit/delete UI.

## Trips

- Trips are couple-scoped and readable by active couple members only.
- Trip creation records the creating member in `created_by_user_id` and is authorized by RLS.
- Trip dates are stored as date-only fields (`start_date`, `end_date`), not timestamps.
- Trip status is derived in app code as `planned`, `active`, or `completed` from the saved couple timezone day token and the stored date range.
- The database enforces `end_date >= start_date`.
- Trips may store a provider source ID, address, and coordinates alongside the trip location display name.
- Trip edits can update title, date range, notes, and location. Date-range edits are rejected when existing stops would fall outside the new range, and likewise rejected when the trip's album holds photos whose memory date (in the saved couple timezone) would fall outside the new range — both guards leave the trip row unchanged.
- Trip delete removes the trip plus trip-rooted stops, albums, and album items through database cascades. Independent memories and their media are not deleted.

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
- A memory or media delete can still empty an album indirectly: when its last `album_items` row cascades away, the app deletes the now-empty album (`deleteEmptyAlbums`).

## Visited Places

- Visited places are couple-scoped and readable by active couple members only.
- Visited places are rooted in `trips`, not in a separate travel hierarchy.
- Visited-place creation records the creating member in `created_by_user_id` and is authorized by RLS.
- `visited_on` is stored as a date-only field and must stay within the parent trip’s `start_date..end_date` window.
- Visited places may store a provider source ID, address, and coordinates alongside the display name.
- `visited_places` has no `location_name` column. The row `title` is the display name, while
  provider metadata stores address, coordinates, and source ID when the user selects a search result.
- The atlas can render MapLibre/OpenFreeMap markers for trips, visited places, and memories with stored coordinates. Route polylines are not part of the current contract.
- This slice has no memory-location auto-derivation.

## Gameplay

- Gameplay is couple-scoped and readable by active couple members only.
- The current live gameplay mode set contains three enum values: `daily_question`, `guess_date`, and `trivia`.
- A gameplay round is unique per `(couple_id, mode, round_date)`.
- `game_rounds.round_date` is the couple-local date token derived from the saved `couples.timezone`, not the server timezone.
- The first successful round creation for a given couple-local day becomes canonical for that day.
- When the couple timezone changes, `update_couple_timezone(...)` clears not-yet-revealed rounds dated today-or-future under the old zone (using each mode's reveal threshold — `daily_question` at 2 answers, `guess_date`/`trivia` at `greatest(active_partner_count, 1)`), so a date shift cannot strand an in-flight round and break reveal. Revealed and past rounds are preserved.
- Daily-question prompt generation is on demand, not cron-driven.
- The stored prompt locale is set by the first successful opener for that couple-local day and is reused for both partners.
- `game_rounds.prompt_source` records `openai` for generated daily-question prompts and `memory` for guess-date and trivia memory clues.
- Guess-date round creation is on demand, not cron-driven.
- A guess-date round is sourced from one existing couple memory selected in SQL: oldest unused by previous couple guess-date rounds, then oldest memory as fallback.
- Guess-date clues are text-only in this slice and use memory note, then location, then a media/generic fallback.
- Guess-date source memory IDs and actual memory dates stay hidden from browser clients until reveal.
- Guess-date answer bodies store ISO date guesses in `game_round_answers.answer_body`.
- Trivia round creation is on demand, not cron-driven.
- A trivia round is sourced from one couple memory with a non-empty `location_name`, selected in SQL: oldest unused by previous couple trivia rounds, then oldest eligible memory as fallback.
- Trivia requires at least two distinct non-empty memory locations for the couple.
- Trivia clue text is stored on the round, while source memory IDs stay hidden from browser clients.
- Trivia answer options are stored server-side as the correct location plus up to three same-couple distractor locations in a stable order.
- Trivia answer bodies store the selected option text in `game_round_answers.answer_body`.
- A gameplay answer is unique per `(round_id, user_id)`.
- Daily-question answers are trimmed non-empty free text and locked after the first successful submission.
- Guess-date answers are ISO date strings and locked after the first successful submission.
- Trivia answers must match one stored option exactly and are locked after the first successful submission.
- Daily-question answers remain hidden until both active partners have submitted for the same round.
- Guess-date actual memory dates and both guesses remain hidden until both active partners have submitted for the same round.
- Trivia correct locations and both selected answers remain hidden until both active partners have submitted for the same round.
- Daily-question reveal, the `/stats` completed-round count, and the timezone-reconcile threshold all count only answers from currently-active members (an answer from a since-deactivated member is excluded), matching the guess-date / trivia rule, so the reveal boundary is identical across all three SQL sites.
- Current gameplay stats are participation-only:
  - completed-round streak
  - total rounds
  - total completed rounds
  - per-viewer participation count and rate
  - recent 14-day status history
- Current gameplay stats are sourced from `daily_question` history only; guess-date and trivia do not expand `/stats`.
- The current slice has no winner, scoring, similarity matching, answer edits, answer deletes, or backfill UI.

## Forbidden States

- More than one `couples` row
- More than two active memberships in a couple
- Two active `partner_a` memberships in one couple
- Two active `partner_b` memberships in one couple
- Direct app-layer join flow that writes `couples` or `couple_memberships` without RPCs
- Implicit auth-gate bootstrap writes before explicit onboarding confirmation
- Storage objects in `memory-media` whose path does not begin with `couples/{uuid}/...`
- Future-note body visibility before the parent note unlock date
- Trip row whose `end_date` is before `start_date`
- Trip date-range edit that leaves existing visited places outside the new range
- More than one album for the same trip in the current contract
- Album row committed without at least one `album_items` row
- Duplicate `album_items` rows for the same `(album_id, memory_media_id)` pair
- Visited-place row whose `visited_on` falls outside the parent trip window
- More than one `game_rounds` row for the same `(couple_id, mode, round_date)` tuple
- More than one `game_round_memory_targets` row for the same `round_id`
- More than one `game_round_answers` row for the same `(round_id, user_id)` pair
- Gameplay answer body that trims to empty text
- Daily-question answers revealed before both partners have submitted
- Guess-date actual date or guesses revealed before both active partners have submitted
- Direct browser access to guess-date memory target rows
- More than one `game_round_trivia_targets` row for the same `round_id`
- Trivia correct answer or selected answers revealed before both active partners have submitted
- Trivia source memory ID exposed to browser clients
- Direct browser access to trivia target rows
- Non-member or cross-couple gameplay read/write access

## Enforcement Map

- Singleton couple space: SQL unique index
- Max two active members: SQL trigger
- Unique active roles: SQL partial unique index
- Direct membership/couple creation from app layer: blocked by RLS and replaced by RPCs
- Invite validity, expiration, and role assignment: SQL RPC
- Couple membership read/write visibility: RLS helper `is_couple_member(...)`
- Storage object access: storage policies using the couple ID embedded in the object path
- Countdown and future-note visibility: RLS on the Phase 2 tables
- Future-note body unlock rule: `get_unlocked_future_note_contents(...)` joined against `future_notes.unlock_at`
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
- Gameplay round visibility and inserts: RLS on `game_rounds`
- Canonical daily round creation: `ensure_daily_question_round(...)`
- Locked single-answer submission: `submit_daily_question_answer(...)`
- Hidden-until-reveal round reads: `get_daily_question_round_state(...)`
- Guess-date memory target access: RLS on `game_round_memory_targets` with RPC-only member access
- Canonical guess-date round creation and SQL memory selection: `ensure_guess_date_round(...)`
- Locked single-date guess submission: `submit_guess_date_answer(...)`
- Guess-date hidden-until-reveal reads: `get_guess_date_round_state(...)`
- Trivia target access: RLS on `game_round_trivia_targets` with RPC-only member access
- Canonical trivia round creation and SQL memory/location selection: `ensure_trivia_round(...)`
- Locked single-option trivia submission: `submit_trivia_answer(...)`
- Trivia hidden-until-reveal reads: `get_trivia_round_state(...)`
- Gameplay aggregate reads: `get_daily_question_stats(...)`

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
- Daily-question generation can fail if:
  - the authenticated user lacks active couple membership
  - `OPENAI_API_KEY` is missing
  - the prompt response is invalid or OpenAI fails
  - the gameplay round RPC rejects the submission unexpectedly
- Daily-question answer submit can fail if:
  - the round is missing or outside the member’s couple scope
  - the answer body is empty or invalid
  - the viewer already submitted an answer for that round
  - database writes fail unexpectedly
- Guess-date generation can fail if:
  - the authenticated user lacks active couple membership
  - the couple has no memories to source a clue
  - the gameplay round RPC rejects the target day unexpectedly
  - database writes fail unexpectedly
- Guess-date answer submit can fail if:
  - the round is missing or outside the member’s couple scope
  - the guessed date is empty or invalid
  - the viewer already submitted a guess for that round
  - database writes fail unexpectedly
- Trivia generation can fail if:
  - the authenticated user lacks active couple membership
  - the couple has fewer than two distinct saved memory locations
  - the gameplay round RPC rejects the target day unexpectedly
  - database writes fail unexpectedly
- Trivia answer submit can fail if:
  - the round is missing or outside the member’s couple scope
  - the selected answer is missing or is not one of the stored options
  - the viewer already submitted an answer for that round
  - database writes fail unexpectedly

## Current Shell Boundaries

- `/games` and `/stats` are implemented.
- `/games/[mode]` is implemented for `/games/daily-question`, `/games/guess-date`, and `/games/trivia`; other mode slugs remain shell-only.
- Shell-only routes must not be treated as proof that backend tables, jobs, or APIs exist.
