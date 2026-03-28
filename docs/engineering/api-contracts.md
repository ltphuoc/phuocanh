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

## Error Conventions
- Server Actions return user-facing error messages through `ActionState`.
- Invite acceptance maps SQL failure codes to user-friendly messages:
- invalid or already used invite
- expired invite
- couple full
- sign-in required
- Memory creation returns validation or storage/database failure messages directly.
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
- Returns `couple_id`, `role`, `started_at`, `name`
- `accept_couple_invite(invite_token)`
- Invite acceptance path only
- Returns `couple_id`, assigned `role`
- `memories_on_this_day(target_couple_id, target_timezone)`
- On-this-day read model
- Returns memory rows filtered by calendar day

## Non-Contracts
- Shell-only and mock-only routes do not imply backend/API support.
- `/chat`, `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, `/future-notes`, `/games`, `/games/[mode]`, `/stats`, and `/settings` add no new runtime API surface today.

## Compatibility Rule
- There is no external versioned API today.
- Internal contract changes must update:
- callers in `src`
- affected docs
- SQL RPC signatures when applicable
