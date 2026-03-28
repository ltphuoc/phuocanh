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
| `/memories/[memoryId]` | implemented | `getMemoryDetailData(...)` | Reads real memory/media rows |
| `/on-this-day` | implemented | `memories_on_this_day(...)` RPC + media lookup | Timezone-aware SQL-backed feature |
| `/chat` | mock-only | local mock message array in `ChatThreadPreview` | No live chat backend, presence, or attachment model exists |
| `/map` | shell-only | none | No Mapbox or trip-pin integration is wired |
| `/trips` | shell-only | none | Uses template content only; no trip entity exists |
| `/trips/[tripId]` | shell-only | route param only | Param is presentation-only; do not assume backend trip lookup |
| `/albums/[albumId]` | shell-only | route param only | Param is presentation-only; album entities are not wired |
| `/countdowns` | shell-only | none | Widgets are placeholders only; no scheduler/job model exists |
| `/future-notes` | shell-only | none | No encrypted notes or unlock jobs exist |
| `/games` | shell-only | none | Hub exists, gameplay logic does not |
| `/games/[mode]` | shell-only | route param only | Mode pages are structured shells, not live game engines |
| `/stats` | shell-only | none | Placeholder metrics only; no analytics pipeline exists |
| `/settings` | shell-only | navigation model only | Acts as a “More” hub, not a real settings backend |

## Status Definitions
- `implemented`: backed by current runtime data or auth logic
- `shell-only`: route defines structure and navigation only
- `mock-only`: route renders fake example data to preview UX
- `planned`: not currently routed
