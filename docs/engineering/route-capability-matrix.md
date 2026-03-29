# Route Capability Matrix

This file is the canonical “what exists today” route map.

| Route | Status | Real data source | Constraints / forbidden assumptions |
|---|---|---|---|
| `/` | implemented | `getAuthGateState()` redirect decision | Redirect-only route; do not add product UI here |
| `/login` | implemented | Supabase Auth via `sendMagicLinkAction` | Public auth entry; no couple context required |
| `/accept-invite` | implemented | `acceptInviteAction` + `accept_couple_invite(...)` RPC | Requires auth before acceptance; not a general onboarding route |
| `/auth/callback` | implemented | Supabase Auth callback exchange | Internal auth handler only; do not add app UI here |
| `/home` | implemented | `getHomePageData(...)` + signed storage URLs | Story-first implemented page; not a shell |
| `/lists` | implemented | `getHomePageData(...)` | Reads real wish/checklist data |
| `/memories/new` | implemented | `createMemoryAction` | Real mutation flow with upload/storage behavior |
| `/memories/[memoryId]` | implemented | `getMemoryDetailData(...)` + signed storage URLs | Reads real memory/media rows |
| `/on-this-day` | implemented | `memories_on_this_day(...)` RPC + media lookup | Timezone-aware SQL-backed feature |
| `/countdowns` | implemented | `getCountdownsPageData(...)` + `createCountdownAction` | Reminder jobs and timezone-aware schedules are still deferred |
| `/future-notes` | implemented | `getFutureNotesPageData(...)` + `createFutureNoteAction` | Metadata is visible immediately; note bodies stay unreadable until `unlock_at <= now()` |
| `/trips` | implemented | `getTripsPageData(...)` + `createTripAction` | Albums now attach to trips; visited-place map layers remain deferred |
| `/trips/[tripId]` | implemented | `getTripDetailData(...)` + album actions | Route param is a real trip UUID; invalid or foreign IDs must not resolve |
| `/albums` | implemented | `getAlbumsPageData(...)` | Albums are trip-rooted and group existing `memory_media`; no separate upload pipeline exists |
| `/albums/[albumId]` | implemented | `getAlbumDetailData(...)` | Route param is a real album UUID; invalid or foreign IDs must not resolve |
| `/chat` | mock-only | local mock message array in `ChatThreadPreview` | No live chat backend, presence, or attachment model exists |
| `/map` | shell-only | none | No Mapbox or visited-place integration is wired |
| `/games` | shell-only | none | Hub exists, gameplay logic does not |
| `/games/[mode]` | shell-only | route param only | Mode pages are structured shells, not live game engines |
| `/stats` | shell-only | none | Placeholder metrics only; no analytics pipeline exists |
| `/settings` | shell-only | navigation model only | Acts as a “More” hub, not a real settings backend |

## Status Definitions
- `implemented`: backed by current runtime data or auth logic
- `shell-only`: route defines structure and navigation only
- `mock-only`: route renders fake example data to preview UX
- `planned`: not currently routed
