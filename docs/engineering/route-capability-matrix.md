# Route Capability Matrix

This file is the canonical “what exists today” route map.

| Route | Status | Real data source | Constraints / forbidden assumptions |
|---|---|---|---|
| `/` | implemented | `getAuthGateState()` redirect decision | Redirect-only route; do not add product UI here |
| `/login` | implemented | Supabase Auth via `sendMagicLinkAction` | Public auth entry; no couple context required |
| `/onboarding` | implemented | `completeOnboardingAction` + `bootstrap_first_couple(...)` RPC | First-account setup only; no writes happen before explicit confirmation |
| `/accept-invite` | implemented | `acceptInviteAction` + `accept_couple_invite(...)` RPC | Requires auth before acceptance; not a general onboarding route |
| `/auth/callback` | implemented | Supabase Auth callback exchange | Internal auth handler only; do not add app UI here |
| `/home` | implemented | `getHomePageData(...)` + signed storage URLs | Story-first implemented page; not a shell |
| `/lists` | implemented | `getHomePageData(...)` | Reads real wish/checklist data |
| `/memories/new` | implemented | `createMemoryAction` | Real mutation flow with upload/storage behavior |
| `/memories/[memoryId]` | implemented | `getMemoryDetailData(...)` + signed storage URLs | Reads real memory/media rows |
| `/on-this-day` | implemented | `memories_on_this_day(...)` RPC + media lookup | Timezone-aware SQL-backed feature |
| `/countdowns` | implemented | `getCountdownsPageData(...)` + `createCountdownAction` | Day-of reminder emails now enqueue automatically for both partners; stored dates follow the saved couple timezone |
| `/future-notes` | implemented | `getFutureNotesPageData(...)` + `createFutureNoteAction` | Metadata is visible immediately; note bodies are encrypted at rest, unreadable until `unlock_at <= now()`, and unlock emails stay summary-only |
| `/trips` | implemented | `getTripsPageData(...)` + `createTripAction` | Trips are the root for both albums and visited places |
| `/trips/[tripId]` | implemented | `getTripDetailData(...)` + album actions | Route param is a real trip UUID; invalid or foreign IDs must not resolve |
| `/albums` | implemented | `getAlbumsPageData(...)` | Albums are trip-rooted and group existing `memory_media`; no separate upload pipeline exists |
| `/albums/[albumId]` | implemented | `getAlbumDetailData(...)` | Route param is a real album UUID; invalid or foreign IDs must not resolve |
| `/map` | implemented | `getMapPageData(...)` + `visited_places` | Atlas is provider-free and trip-linked; no coordinates, tiles, or route polylines exist yet |
| `/chat` | mock-only | local mock message array in `ChatThreadPreview` | Deprecated mock artifact only; no live chat backend, presence, or attachment model exists, and no roadmap work should assume it will be expanded |
| `/games` | shell-only | none | Hub exists, gameplay logic does not |
| `/games/[mode]` | shell-only | route param only | Mode pages are structured shells, not live game engines |
| `/stats` | shell-only | none | Placeholder metrics only; no analytics pipeline exists |
| `/settings` | implemented | `getReadyCoupleContextOrRedirect()` + `updateCoupleTimezoneAction` | Owns the shared couple timezone only; account/privacy/per-user settings are still deferred |

## Next Documented Backend Slice
- `Phase 3 Slice 1: Games + Stats foundation` is the next implementation target after the Phase 2 closeout.
- Current route statuses stay unchanged until that slice lands.
- Planned acceptance criteria for that slice:
  - `/games` becomes a real backend-backed hub with mode availability and entry links
  - `/games/[mode]` gets one live mode only: `/games/daily-question`
  - `/stats` reads real couple-scoped gameplay aggregates instead of placeholder values
- `/chat` cleanup remains maintenance work and is not part of the gameplay roadmap.

## Engineering Follow-Up Note
- Reminder cron/invoke uses Vault-backed secrets in hosted environments.
- Local and CI replay uses a private fallback secret store when Vault is unavailable, so this is no longer a route-capability blocker.

## Status Definitions
- `implemented`: backed by current runtime data or auth logic
- `shell-only`: route defines structure and navigation only
- `mock-only`: route renders fake example data to preview UX or survives temporarily as a deprecated artifact pending cleanup
- `planned`: not currently routed
