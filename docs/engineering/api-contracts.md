# API Contracts

This app does not expose a public REST or GraphQL API. The live runtime contract is:
- Server Actions in `src/app/actions/*`
- one route handler at `/auth/callback`
- SQL RPCs defined in `supabase/migrations/*.sql`

## Shared ActionState Contract
- `ActionState = { status: "idle" | "success" | "error"; message: string }`
- `ActionStateWithData<T> = ActionState & { data?: T }`
- Current client forms depend on this shape. Do not change it casually.

## Server Actions
| Action | Input | Output | Notes |
|---|---|---|---|
| `sendMagicLinkAction` | `email` | `ActionState` | Requests Supabase magic link; no revalidation |
| `createInviteAction` | none | `ActionStateWithData<{ inviteUrl: string }>` | Creates a 14-day invite URL for the current couple |
| `acceptInviteAction` | `token` | `ActionState` | Must call `accept_couple_invite(...)`; no direct membership writes |
| `createMemoryAction` | `happenedAt`, `locationName?`, `note?`, `media?` | `ActionState` | Requires note or media; max `25MB`; revalidates `/home`, `/on-this-day`, `/lists` |
| `addWishItemAction` | `category`, `title`, `note?` | `ActionState` | Revalidates `/home`, `/lists` |
| `createChecklistAction` | `title` | `ActionState` | Revalidates `/home`, `/lists` |
| `addChecklistItemAction` | `checklistId`, `text` | `ActionState` | Revalidates `/home`, `/lists` |
| `toggleChecklistItemAction` | `checklistItemId`, `nextDone` | `ActionState` | Revalidates `/home`, `/lists` |
| `createCountdownAction` | `title`, `kind`, `targetDate`, `note?` | `ActionState` | Derives the stored UTC instant from the couple timezone; revalidates `/countdowns` only |
| `createFutureNoteAction` | `title`, `unlockDate`, `body` | `ActionState` | Derives the stored UTC instant from the couple timezone; inserts metadata + body rows; revalidates `/future-notes` only |
| `createTripAction` | `title`, `startDate`, `endDate`, `note?` | `ActionState` | Inserts into `trips`; revalidates `/trips` only |
| `createVisitedPlaceAction` | `tripId`, `title`, `visitedOn`, `note?` | `ActionState` | Inserts into `visited_places`; revalidates `/map` and `/trips/[tripId]` |
| `createAlbumAction` | `tripId`, `title`, `description?`, `memoryMediaIds[]` | `ActionState` | Calls `create_album_with_items(...)`; revalidates `/albums` and `/trips/[tripId]` |
| `addAlbumItemsAction` | `albumId`, `tripId`, `memoryMediaIds[]` | `ActionState` | Calls `add_album_items(...)`; revalidates `/albums`, `/albums/[albumId]`, and `/trips/[tripId]` |
| `updateCoupleTimezoneAction` | `timeZone` | `ActionState` | Calls `update_couple_timezone(...)`; revalidates `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, and `/map` |

## Error Conventions
- Server Actions return user-facing error messages through `ActionState`.
- Invite acceptance maps SQL failure codes to user-friendly messages:
  - invalid or already used invite
  - expired invite
  - couple full
  - sign-in required
- Memory creation returns validation or storage/database failure messages directly.
- Countdown, future-note, trip, visited-place, album, and couple-timezone mutations return validation errors through `countdown.invalidSubmission`, `futureNote.invalidSubmission`, `trip.invalidSubmission`, `visitedPlace.invalidSubmission`, `album.invalidSubmission`, and `settings.timezone.invalidSubmission`.
- `/auth/callback` does not return a JSON error payload; it redirects to `/login` on callback failure.

## Route Handler
- `GET /auth/callback`
- Accepts either:
  - `code` + optional `next`
  - `token_hash` + `type` + optional `next`
- Exchanges/verifies Supabase auth callback and redirects to a normalized internal path.

## Database RPCs Used By App Layer
- `bootstrap_first_couple(started_date, couple_name)`
  - Auth gate bootstrap path only
  - Returns `couple_id`, `role`, `started_at`, `name`, `timezone`
- `accept_couple_invite(invite_token)`
  - Invite acceptance path only
  - Returns `couple_id`, assigned `role`
- `update_couple_timezone(target_couple_id, target_timezone)`
  - Shared timezone mutation path only
  - Validates active membership plus IANA timezone validity
  - Preserves existing countdown and future-note calendar dates while rewriting stored UTC instants
- `memories_on_this_day(target_couple_id, target_timezone)`
  - On-this-day read model
  - Returns memory rows filtered by calendar day
- `create_album_with_items(target_trip_id, album_title, album_description, selected_memory_media_ids)`
  - Album creation path only
  - Creates one trip-rooted album plus its initial `album_items` transactionally
  - Returns the created album UUID
- `add_album_items(target_album_id, selected_memory_media_ids)`
  - Album append path only
  - Adds only remaining eligible media for the album/trip window
  - Returns inserted item count

## Phase 2 Read Model
- `getCountdownsPageData(context)`
  - Reads couple-scoped countdown rows and splits them into `upcoming` and `past` using the saved couple timezone
- `getFutureNotesPageData(context)`
  - Reads future-note metadata, then reads unlocked bodies from `future_note_contents`
- `getTripsPageData(context)`
  - Reads couple-scoped trip rows and groups them into `active`, `planned`, and `completed` using the saved couple timezone
- `getTripDetailData(context, tripId)`
  - Reads one couple-scoped trip row
  - Reads trip-scoped `visited_places` ordered by `visited_on`, then `created_at`
  - Returns the linked album summary or `null`
  - Returns remaining eligible media candidates for create/add album flows
  - Returns `null` for missing or invalid IDs
- `getMapPageData(context)`
  - Reads couple-scoped `visited_places` ordered newest-first
  - Groups them by trip for the atlas read model
- `getAlbumsPageData(context)`
  - Reads couple-scoped albums with linked trip summaries and album cover/count metadata
- `getAlbumDetailData(context, albumId)`
  - Reads one couple-scoped album, linked trip metadata, and signed album media items
  - Returns `null` for missing or invalid IDs
- `signMemoryMediaStorageItems(items)`
  - Shared server helper used by home, memory detail, and album reads for `memory-media` signed URLs

## Non-Contracts
- Shell-only and mock-only routes do not imply backend/API support.
- `/chat`, `/games`, `/games/[mode]`, and `/stats` add no new runtime API surface today.
- Reminder jobs, encryption-at-rest, realtime chat, coordinates, route polylines, captions, album reordering, and provider-backed geographic tiles are not part of the current runtime contract.

## Compatibility Rule
- There is no external versioned API today.
- Internal contract changes must update:
  - callers in `src`
  - affected docs
  - SQL RPC signatures when applicable
