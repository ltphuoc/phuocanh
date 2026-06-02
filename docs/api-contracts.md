# API Contracts

This app does not expose a public REST or GraphQL API. The live runtime contract is:

- Server Actions in `src/app/actions/*`
- route handlers at `/auth/callback`, `/auth/callback/verify-email-otp`, and internal `/api/app-data/...`
- SQL RPCs defined in `supabase/migrations/*.sql`

## Shared ActionState Contract

- `ActionState = { status: "idle" | "success" | "error"; message: string }`
- `ActionStateWithData<T> = ActionState & { data?: T }`
- Current client forms depend on this shape. Do not change it casually.

## Server Actions

| Action                            | Input                                                                                              | Output                                       | Notes                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sendMagicLinkAction`             | `email`, `locale?`, `next?`                                                                        | `ActionState`                                | Requests Supabase magic link; preserves a valid internal `next` path through the auth callback; no revalidation                                                                                               |
| `completeOnboardingAction`        | `coupleName`, `timeZone`, `startedDate`, `confirmation`                                            | `ActionState`                                | First-user setup only; validates summary confirmation; calls `bootstrap_first_couple(...)`; revalidates `/` and `/home`                                                                                       |
| `createInviteAction`              | none                                                                                               | `ActionStateWithData<{ inviteUrl: string }>` | Creates a 14-day invite URL for the current couple                                                                                                                                                            |
| `acceptInviteAction`              | `token`                                                                                            | `ActionState`                                | Must call `accept_couple_invite(...)`; no direct membership writes                                                                                                                                            |
| `createMemoryAction`              | `memoryId`, `happenedAt`, location fields, `note?`, media metadata arrays                          | `ActionState`                                | Requires note or at least one media item; max `25MB` per file; supports multiple image/video media rows; revalidates memory-derived routes                                                                    |
| `updateMemoryAction`              | `memoryId`, `happenedAt`, location fields, `note?`, removed media IDs, added media metadata arrays | `ActionState`                                | Updates memory data and media; removes deleted storage objects best-effort; keeps note-or-media requirement                                                                                                   |
| `deleteMemoryAction`              | `memoryId`, `confirmation=delete`                                                                  | `ActionState`                                | Deletes the memory row, cascades media/album items, removes storage objects best-effort, and deletes albums left empty by the mutation                                                                        |
| `addWishItemAction`               | `category`, `title`, `note?`                                                                       | `ActionState`                                | Revalidates `/home`, `/lists`                                                                                                                                                                                 |
| `createChecklistAction`           | `title`                                                                                            | `ActionState`                                | Revalidates `/home`, `/lists`                                                                                                                                                                                 |
| `addChecklistItemAction`          | `checklistId`, `text`                                                                              | `ActionState`                                | Revalidates `/home`, `/lists`                                                                                                                                                                                 |
| `toggleChecklistItemAction`       | `checklistItemId`, `nextDone`                                                                      | `ActionState`                                | Revalidates `/home`, `/lists`                                                                                                                                                                                 |
| `createCountdownAction`           | `title`, `kind`, `targetDate`, `note?`                                                             | `ActionState`                                | Derives the stored UTC instant from the couple timezone; revalidates `/countdowns` only                                                                                                                       |
| `createFutureNoteAction`          | `title`, `unlockDate`, `body`                                                                      | `ActionState`                                | Derives the stored UTC instant from the couple timezone; calls `create_future_note_with_body(...)`; maps explicit RPC validation failures to `futureNote.invalidSubmission`; revalidates `/future-notes` only |
| `createTripAction`                | `title`, `startDate`, `endDate`, `note?`, location fields                                          | `ActionState`                                | Inserts into `trips`; revalidates trip/map/album routes                                                                                                                                                       |
| `updateTripAction`                | `tripId`, `title`, `startDate`, `endDate`, `note?`, location fields                                | `ActionState`                                | Updates trip fields; rejects date ranges that exclude existing stops                                                                                                                                          |
| `deleteTripAction`                | `tripId`, `confirmation=delete`                                                                    | `ActionState`                                | Deletes the trip and trip-rooted stops/albums through SQL cascades; does not delete independent memories                                                                                                      |
| `createVisitedPlaceAction`        | `tripId`, `title`, `visitedOn`, `note?`, location fields                                           | `ActionState`                                | Inserts into `visited_places`; can persist mapped place metadata; revalidates `/map` and `/trips/[tripId]`                                                                                                    |
| `createAlbumAction`               | `tripId`, `title`, `description?`, `memoryMediaIds[]`                                              | `ActionState`                                | Calls `create_album_with_items(...)`; revalidates `/albums` and `/trips/[tripId]`                                                                                                                             |
| `addAlbumItemsAction`             | `albumId`, `tripId`, `memoryMediaIds[]`                                                            | `ActionState`                                | Calls `add_album_items(...)`; revalidates `/albums`, `/albums/[albumId]`, and `/trips/[tripId]`                                                                                                               |
| `updateCoupleTimezoneAction`      | `timeZone`                                                                                         | `ActionState`                                | Calls `update_couple_timezone(...)`; revalidates `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, and `/map`                                                        |
| `ensureDailyQuestionRoundAction`  | `locale`                                                                                           | `ActionState`                                | Generates one prompt through the OpenAI Responses API, calls `ensure_daily_question_round(...)`, and revalidates `/games`, `/games/daily-question`, and `/stats`                                              |
| `submitDailyQuestionAnswerAction` | `roundId`, `answerBody`                                                                            | `ActionState`                                | Calls `submit_daily_question_answer(...)`; answers are single-submit and locked after success; revalidates `/games`, `/games/daily-question`, and `/stats`                                                    |
| `ensureGuessDateRoundAction`      | none                                                                                               | `ActionState`                                | Calls `ensure_guess_date_round(...)`; creates or opens one memory-backed `guess_date` round for the couple-local day; revalidates `/games` and `/games/guess-date` only                                       |
| `submitGuessDateAnswerAction`     | `roundId`, `guessedDate`                                                                           | `ActionState`                                | Calls `submit_guess_date_answer(...)`; guesses are single-submit and locked after success; revalidates `/games` and `/games/guess-date` only                                                                  |
| `ensureTriviaRoundAction`         | none                                                                                               | `ActionState`                                | Calls `ensure_trivia_round(...)`; creates or opens one memory-location `trivia` round for the couple-local day; revalidates `/games` and `/games/trivia` only                                                 |
| `submitTriviaAnswerAction`        | `roundId`, `selectedAnswer`                                                                        | `ActionState`                                | Calls `submit_trivia_answer(...)`; selected options are single-submit and locked after success; revalidates `/games` and `/games/trivia` only                                                                 |

Migrated authenticated app-data Server Actions no longer refresh the active router tree after success. They keep path revalidation for later server-rendered navigations; same-session UI freshness is owned by TanStack Query invalidation, cache updates, and optimistic updates in the calling form.

`sendMagicLinkAction` only requests the Supabase email. It does not establish an app session; the session boundary is `/auth/callback`, which must receive the Supabase token data and set auth cookies before redirecting to `next`.

## Error Conventions

- Server Actions return user-facing error messages through `ActionState`.
- Invite acceptance maps SQL failure codes to user-friendly messages:
  - invalid or already used invite
  - expired invite
  - couple full
  - sign-in required
- Memory creation returns validation or storage/database failure messages directly.
- Onboarding returns validation/state errors through `auth.onboarding.invalidSubmission` and `auth.onboarding.coupleExists`.
- Countdown, future-note, trip, visited-place, album, and couple-timezone mutations return validation errors through `countdown.invalidSubmission`, `futureNote.invalidSubmission`, `trip.invalidSubmission`, `visitedPlace.invalidSubmission`, `album.invalidSubmission`, and `settings.timezone.invalidSubmission`.
- Daily-question mutations return validation/action errors through:
  - `gameplay.dailyQuestion.invalidSubmission`
  - `gameplay.dailyQuestion.generationFailed`
  - `gameplay.dailyQuestion.ready`
  - `gameplay.dailyQuestion.answered`
  - `gameplay.dailyQuestion.alreadyAnswered`
- Guess-date mutations return validation/action errors through:
  - `gameplay.guessDate.invalidSubmission`
  - `gameplay.guessDate.noMemory`
  - `gameplay.guessDate.ready`
  - `gameplay.guessDate.answered`
  - `gameplay.guessDate.alreadyAnswered`
- Trivia mutations return validation/action errors through:
  - `gameplay.trivia.invalidSubmission`
  - `gameplay.trivia.noMemory`
  - `gameplay.trivia.ready`
  - `gameplay.trivia.answered`
  - `gameplay.trivia.alreadyAnswered`
- `/auth/callback` does not return a JSON error payload; it redirects to `/login` on callback failure.

## Route Handler

- `GET /auth/callback`
- Accepts either:
  - `code` + optional `next`
  - `token_hash` + `type` + optional `next`
- Exchanges/verifies Supabase auth callback and redirects to a normalized internal path.
- SSR-compatible magic-link templates should link directly to `/auth/callback?next=...&token_hash={{ .TokenHash }}&type=email` instead of relying on a fragment/session response from Supabase Auth.
- `POST /auth/callback/verify-email-otp`
- Internal-only local E2E helper; not part of the user-facing auth flow.
- Accepts JSON body with `email` and six-digit `otpCode`.
- Enabled only when `E2E_ENABLE_EMAIL_OTP_HELPER=true` and the request arrives through a loopback host.
- Verifies email OTP through Supabase Auth and returns JSON `{"ok": true}` on success.

## Internal App-Data Route Handlers

- These endpoints are an internal client refetch surface for TanStack Query, not a public external API.
- Every endpoint requires an authenticated ready couple context through `getAuthGateState()`.
- Unauthenticated requests return `401`; authenticated users without a ready couple context return `403`.
- Responses are JSON only and send `Cache-Control: no-store`.
- Route handlers call the same server app-data helpers as server prefetch wrappers; business rules remain in server read helpers, Server Actions, SQL RLS, and SQL RPCs.

| Route                                    | Data key           | Notes                                                                                                                              |
| ---------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/app-data/home`                 | `home`             | Home timeline, wish items, checklists, signed memory preview URLs                                                                  |
| `GET /api/app-data/lists`                | `lists`            | Wish items and checklists                                                                                                          |
| `GET /api/app-data/on-this-day`          | `onThisDay`        | Couple-scoped on-this-day memories                                                                                                 |
| `GET /api/app-data/memories/[memoryId]`  | `memory(memoryId)` | Memory detail and signed media; `404` when not visible                                                                             |
| `GET /api/app-data/countdowns`           | `countdowns`       | Upcoming and past countdowns                                                                                                       |
| `GET /api/app-data/future-notes`         | `futureNotes`      | Locked metadata and decrypted unlocked bodies through RPC                                                                          |
| `GET /api/app-data/trips`                | `trips`            | Active, planned, completed trips                                                                                                   |
| `GET /api/app-data/trips/[tripId]`       | `trip(tripId)`     | Trip detail, visited places, album summary, eligible media; `404` when not visible                                                 |
| `GET /api/app-data/map`                  | `map`              | Trip-grouped visited places plus located trips and memories                                                                        |
| `GET /api/geo/search?q=...`              | location search    | Authenticated server-side Nominatim geocoding proxy with cache/rate limits; returns normalized place candidates or safe error keys |
| `GET /api/app-data/albums`               | `albums`           | Album summaries with signed covers                                                                                                 |
| `GET /api/app-data/albums/[albumId]`     | `album(albumId)`   | Album detail and signed media; `404` when not visible                                                                              |
| `GET /api/app-data/settings`             | `settings`         | Current shared timezone                                                                                                            |
| `GET /api/app-data/games`                | `games`            | Games hub daily-question, guess-date, and trivia state                                                                             |
| `GET /api/app-data/games/daily-question` | `dailyQuestion`    | Current daily-question round, viewer state, reveal state                                                                           |
| `GET /api/app-data/games/guess-date`     | `guessDate`        | Current guess-date round, viewer state, clue state, reveal state                                                                   |
| `GET /api/app-data/games/trivia`         | `trivia`           | Current trivia round, viewer state, clue/options state, reveal state                                                               |
| `GET /api/app-data/stats`                | `stats`            | Daily-question stats and recent history                                                                                            |

## Database RPCs Used By App Layer

- `bootstrap_first_couple(started_date, couple_name, target_timezone)`
  - Explicit onboarding-confirmation path only
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
- `create_future_note_with_body(note_title, note_unlock_at, note_body)`
  - Future-note mutation path only
  - Validates title/body presence and max lengths inside SQL
  - Creates metadata plus encrypted note content transactionally
  - Returns the created future-note UUID
- `get_unlocked_future_note_contents(target_couple_id)`
  - Future-note unlocked-body read path only
  - Returns decrypted bodies only for unlocked notes visible to the active couple member
- `ensure_daily_question_round(target_mode, target_round_date, prompt_locale, prompt_text, prompt_source)`
  - Gameplay round creation path only
  - Accepts the generated prompt payload, inserts the canonical round if missing, and returns the existing round ID if another request already created it
  - Direct browser inserts into `game_rounds` are not part of the contract
- `submit_daily_question_answer(target_round_id, answer_body)`
  - Gameplay answer mutation path only
  - Verifies active membership, same-couple access, one-answer-per-user, and locked-after-submit behavior
  - Returns the created answer UUID
- `get_daily_question_round_state(target_round_date)`
  - Secure gameplay round read path only
  - Returns today’s round metadata plus revealed answers only when the round is complete
- `ensure_guess_date_round(target_round_date)`
  - Guess-date round creation path only
  - Requires active membership and creates or returns the canonical `guess_date` round for the couple-local day
  - Selects the source memory in SQL, preferring the oldest unused memory for this couple’s prior guess-date rounds, then the oldest memory fallback
  - Stores a text clue in `game_rounds.prompt_text`, `prompt_source = 'memory'`, and links the round to `game_round_memory_targets`
  - Raises `NO_GUESS_DATE_MEMORY` when no couple memory exists
- `submit_guess_date_answer(target_round_id, guessed_date)`
  - Guess-date answer mutation path only
  - Verifies active membership, same-couple access, one-answer-per-user, and locked-after-submit behavior
  - Stores the ISO date guess in `game_round_answers.answer_body`
- `get_guess_date_round_state(target_round_date)`
  - Secure guess-date read path only
  - Returns clue/status fields before reveal without memory ID or actual date
  - Reveals `actual_date` and both guesses only when all active partners have submitted
- `ensure_trivia_round(target_round_date)`
  - Trivia round creation path only
  - Requires active membership and creates or returns the canonical `trivia` round for the couple-local day
  - Requires at least two distinct non-empty same-couple memory locations
  - Selects the source memory in SQL, preferring the oldest unused eligible memory for prior trivia rounds, then the oldest eligible memory fallback
  - Stores a text clue in `game_rounds.prompt_text`, `prompt_source = 'memory'`, and links the round to `game_round_trivia_targets`
  - Stores stable answer options server-side and raises `NO_TRIVIA_MEMORY` when the couple has insufficient location data
- `submit_trivia_answer(target_round_id, selected_answer)`
  - Trivia answer mutation path only
  - Verifies active membership, same-couple access, one-answer-per-user, locked-after-submit behavior, and selected option membership
  - Stores the selected option text in `game_round_answers.answer_body`
- `get_trivia_round_state(target_round_date)`
  - Secure trivia read path only
  - Returns clue, options, answer count, viewer submission state, and status before reveal without memory ID or correct answer
  - Reveals `correct_answer` plus both selected answers and `is_correct` only when all active partners have submitted
- `get_daily_question_stats(target_history_days)`
  - Secure gameplay stats read path only
  - Computes `today` from the saved couple timezone before building streak/history output
  - Returns aggregate counts plus recent status history without exposing raw answer rows
- `has_any_couple()`
  - Auth-gate helper only
  - Security-definer boolean RPC used when `SUPABASE_SERVICE_ROLE_KEY` is unset
  - Distinguishes `needs_invite` vs `needs_onboarding` without relying on direct `couples` table reads

## Phase 2 Read Model

- `getCountdownsPageData(context)`
  - Reads couple-scoped countdown rows and splits them into `upcoming` and `past` using the saved couple timezone
- `getFutureNotesPageData(context)`
  - Reads future-note metadata, then reads decrypted unlocked bodies through `get_unlocked_future_note_contents(...)`
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

## Location Fields

Location-capable mutations accept:

- `locationName`
- `locationAddress`
- `locationProvider`
- `locationProviderId`
- `locationLongitude`
- `locationLatitude`

The current provider value for new selections is `nominatim`; older rows may still contain `mapbox`.
Coordinates are nullable and must be stored as a valid longitude/latitude pair when present. Trips
and memories store the selected place display name in `location_name`. `visited_places` has no
`location_name` column; its `title` remains the display name, while address, coordinates, provider,
and provider source ID are stored in the location metadata columns.

`GET /api/geo/search?q=...` is the only geocoding entry point for browser clients:

- It requires an authenticated ready-couple context before provider access.
- It calls Nominatim server-side only; clients must not call Nominatim directly.
- Searches are submit-driven by the location picker, not per-keystroke autocomplete.
- The server keeps a per-process query cache, per-user rate limit, and global upstream throttle.
- Successful responses are `{"locations": LocationDraft[]}` with `provider: "nominatim"` and
  `providerId` from `osm_type:osm_id` when available, falling back to `place_id`.
- Safe failure responses use `{"locations": [], "error": "rate_limited"}` or
  `{"locations": [], "error": "geo_provider_unavailable"}` so forms can degrade without exposing
  provider internals.

## Phase 3 Read Model

- `getGamesHubData(context)`
  - Reads today’s daily-question, guess-date, and trivia rounds for the couple-local day
  - Returns the current viewer status for the hub cards through secure gameplay state RPCs
- `getDailyQuestionPageData(context, roundId?)`
  - Reads today’s daily-question round, the viewer submission state, and the reveal state
  - Uses `get_daily_question_round_state(...)` so answer bodies stay hidden until reveal
  - Returns `null` round state for missing/foreign/invalid round IDs
- `getGuessDatePageData(context)`
  - Reads today’s guess-date round, the viewer submission state, clue state, and reveal state
  - Uses `get_guess_date_round_state(...)` so actual memory dates and guesses stay hidden until reveal
  - Returns `null` round state when no canonical round exists for the couple-local day
- `getTriviaPageData(context)`
  - Reads today’s trivia round, the viewer submission state, clue/options state, and reveal state
  - Uses `get_trivia_round_state(...)` so the source memory ID, correct answer, and selected answers stay hidden until reveal
  - Returns `null` round state when no canonical round exists for the couple-local day
- `getGameplayStatsPageData(context)`
  - Reads gameplay-only daily-question aggregates for `/stats`
  - Uses `get_daily_question_stats(...)`
  - Returns current completed streak, total rounds, total completed rounds, viewer participation metrics, and recent 14-day history

## Non-Contracts

- Shell-only routes do not imply backend/API support.
- `/games/[mode]` is backend-backed for `/games/daily-question`, `/games/guess-date`, and `/games/trivia`; other mode slugs still do not imply additional gameplay APIs.
- Coordinates, route polylines, captions, album reordering, and provider-backed geographic tiles are not part of the current runtime contract yet.

## Compatibility Rule

- There is no external versioned API today.
- Internal contract changes must update:
  - callers in `src`
  - affected docs
  - SQL RPC signatures when applicable
