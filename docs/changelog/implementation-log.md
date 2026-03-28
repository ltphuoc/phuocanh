# Implementation Log

## 2026-03-27 - Phase 1 MVP

### Delivered
- Added Phase 1 schema migration with RLS policies and private storage policy.
- Implemented auth (magic link + callback) and invite acceptance flow.
- Implemented protected app shell with mobile-first navigation.
- Implemented memory capture flow (note + optional image/video upload).
- Implemented timeline and on-this-day views.
- Implemented relationship day counter on home.
- Implemented wish items and checklists with toggle.
- Added required product/engineering documentation set as source of truth.

### Known Gaps
- Drizzle ORM package integration is deferred due offline dependency constraints in this environment.
- Media processing/transcoding and thumbnail generation are not included in Phase 1.
- Automated tests are not yet added (Phase 1 focused on baseline functionality + schema/security).

## 2026-03-27 - Stage A Hardening (Fix-All)

### Delivered
- Added hardening migration `20260327233000_phase1_hardening.sql`.
- Added singleton couple-space index and active-role uniqueness index.
- Added stronger max-two-members enforcement trigger for insert/update paths.
- Tightened RLS policies: blocked direct membership inserts and restricted invite row read/update to members.
- Added `bootstrap_first_couple` RPC and moved bootstrap flow in app to RPC.
- Added `accept_couple_invite` RPC and moved invite acceptance action to RPC.
- Hardened `/auth/callback` redirect target normalization for `next`.
- Added pre-insert file validation and rollback cleanup for partial memory upload failures.
- Replaced capped on-this-day in-app filtering with SQL-side `memories_on_this_day` RPC query.
- Updated docs to reflect hardening decisions and contracts.

### Migration / Operational Notes
- New RPCs are granted to `authenticated` and revoked from `public`.
- `memories_delete` policy is added to support compensating rollback for failed memory uploads.

### Remaining Gaps
- Stage B dependency gate is still required before Phase 2 delivery:
- install `drizzle-orm`, `drizzle-kit`, `mapbox-gl`, and a React Mapbox wrapper with reproducible lockfile/CI install.
- Stage B gate attempt on 2026-03-27 failed due registry DNS/network access (`ENOTFOUND registry.npmjs.org` and no offline metadata for `drizzle-kit`).

## 2026-03-27 - Local Env/Auth Redirect Fix

### Delivered
- Fixed local Supabase auth URL configuration in `supabase/config.toml`:
- `site_url` now uses `http://localhost:3000`.
- `additional_redirect_urls` now explicitly allows both `localhost` and `127.0.0.1` callback URLs over HTTP.
- Updated `.env.example` to provide a working local Supabase API URL default (`http://127.0.0.1:54321`).
- Updated README local environment instructions to avoid host mismatch during auth callback.

## 2026-03-28 - Server Action Runtime Unblock

### Delivered
- Fixed Next.js server-action contract violation by removing non-async export from `auth-actions.ts`.
- Moved invite initial action state to client form module.
- Updated client forms to dispatch `useActionState` actions inside `startTransition` to satisfy React/Next runtime constraints.

### Verification
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- Next.js runtime diagnostics no longer report `invalid-use-server-value` or `useActionState` transition errors on `/login`.

## 2026-03-28 - Login Reachability Hardening

### Delivered
- Added local Supabase URL fallback for magic-link requests (`localhost` ⇄ `127.0.0.1`) in auth action flow.
- Added clearer login error for network reachability failures to replace generic `fetch failed`.
- Added server client factory support for explicit Supabase URL override in server actions.

### Notes
- Login still requires a reachable Supabase Auth endpoint on local port `54321`.

## 2026-03-28 - Magic Link Callback Compatibility Fix

### Delivered
- Updated auth callback handler to support both Supabase magic-link callback shapes:
- PKCE flow via `code` + `exchangeCodeForSession(...)`.
- OTP verify flow via `token_hash` + `type` + `verifyOtp(...)`.
- Preserved existing safe `next` path normalization behavior.

## 2026-03-28 - Runtime Stabilization + Phase 2 Gate Prep

### Delivered
- Added typed schema-readiness error detection for core auth-gate table reads (`public.couple_memberships`, `public.couples`).
- Added actionable setup rendering in global error boundary for missing-schema local environments.
- Updated Next.js config with `experimental.serverActions.bodySizeLimit = "26mb"` to match 25MB media contract.
- Updated callback contract docs to explicitly cover both PKCE (`code`) and OTP (`token_hash` + `type`) callback forms.
- Updated onboarding instructions to explicit local Supabase Docker flow (`supabase start`, `supabase db reset --local`, `pnpm dev`).
- Added Drizzle baseline artifact paths (`drizzle.config.ts`, `src/lib/db/schema.ts`) and parity/gate notes in engineering docs.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm install --frozen-lockfile`
- `pnpm add drizzle-orm mapbox-gl react-map-gl` (blocked: `ENOTFOUND registry.npmjs.org`)
- `pnpm add -D drizzle-kit` (blocked: `ENOTFOUND registry.npmjs.org`)

### Operational Notes
- Full live DB parity verification for Drizzle still requires running local Supabase CLI commands outside this sandbox.
- Phase 2 dependency gate remains blocked until package registry access is restored.

## 2026-03-28 - Desktop/Tablet Pink UI Redesign

### Delivered
- Redesigned global visual tokens to a pink-first palette for light mode with coordinated rose-toned dark mode.
- Added responsive authenticated shell with desktop/tablet side navigation and retained mobile bottom navigation.
- Introduced shared app navigation model consumed by both navigation surfaces.
- Refreshed core primitives (`SectionCard`, `Button`, `Input`, `Select`, `Textarea`, `Badge`) for consistent cute style treatment.
- Updated key Phase 1 routes for tablet/desktop polish: login, accept-invite, home, lists, on-this-day, memory detail, and new memory form.
- Updated product and engineering docs to reflect responsive/UI architecture decisions.

### Verification
- `pnpm lint`
- `pnpm typecheck`

## 2026-03-28 - Next.js 16 Cookie Mutation Compatibility Hardening

### Delivered
- Hardened Supabase server client cookie writer to be render-safe in Server Components.
- `setAll` now performs best-effort cookie writes and safely ignores mutation failures outside Server Actions/Route Handlers.
- Preserved middleware as canonical cookie refresh write path; no auth flow contract changes.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-28 - Full UI System Refactor (Pink Responsive)

### Delivered
- Expanded global design tokens and utility classes for pink light + rose dark surfaces, elevation, and focus ring consistency.
- Refactored navigation and authenticated shell spacing for cohesive tablet/desktop sidebar + mobile bottom navigation behavior.
- Added reusable layout primitives and standardized all implemented Phase 1 routes onto those primitives:
- public auth pages (`/login`, `/accept-invite`)
- app pages (`/home`, `/lists`, `/on-this-day`, `/memories/new`, `/memories/[memoryId]`)
- global states (`loading`, `error`, `not-found`)
- Added shared UI components for consistency:
- `LoadingState`, `ListRow`, `MemoryCard`, improved `EmptyState`
- future template components (`TripCardTemplate`, `GameCardTemplate`, `CountdownWidgetTemplate`, `StatCardTemplate`)
- Refactored form composition with `FormSection` for consistent label/field hierarchy and responsive rhythm.
- Added required UI specification docs:
- `docs/design-system.md`
- `docs/responsive-guidelines.md`

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-28 - Full UI Restructure (Light-Only Pastel)

### Delivered
- Removed dark-mode token branching and standardized the app on a single pastel pink light-mode design system.
- Upgraded navigation architecture:
- replaced emoji navigation with typed `lucide-react` icons.
- introduced grouped nav model (`Main` + `More`) for sidebar.
- introduced mobile `primary + More` bottom navigation and mobile context strip.
- Added reusable UI architecture primitives for shell pages:
- `ShellPage` and `ComingSoonCard`.
- Added presentational shell routes (no backend logic changes):
- `/trips`, `/trips/[tripId]`
- `/albums/[albumId]`
- `/map`
- `/countdowns`
- `/future-notes`
- `/games`, `/games/[mode]`
- `/stats`
- `/settings`
- Updated docs for design system, responsive rules, UI architecture, and feature status.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-29 - Docs Reconciliation (UI Restructure Sync)

### Delivered
- Updated roadmap state to reflect current code reality: Phase 2 marked `partial` due shipped UI shells with backend wiring still pending.
- Updated architecture and decision docs to match final shell behavior:
- mobile context strip + bottom navigation
- grouped sidebar navigation (`Main + More`)
- light-mode-only pastel policy
- Added explicit user decision record for 2026-03-29 UI architecture finalization.
- Clarified features and API-contract docs that shell routes are presentational and do not change server/data contracts.
- Updated README notes to remove stale runtime blocker phrasing and reflect current phase state.

### Notes
- Older entries that mention temporary dependency/network blockers are preserved as historical context, not current status.
- This reconciliation pass changes documentation only; no API, schema, or business logic behavior was modified.

## 2026-03-29 - Pastel Palette Standardization and UI Consistency Pass

### Delivered
- Aligned global base tokens to the exact requested palette:
- `--background: #FFF5E4`
- `--surface: #FFE3E1`
- `--soft-accent: #FFD1D1`
- `--primary: #FF9494`
- Kept semantic color system fully derived from the four base colors and retained light-mode-only rendering.
- Refactored `EmptyState` icon contract from emoji string to typed `ReactNode` icon slot for consistent UI composition.
- Replaced emoji-based placeholder markers with Lucide icons across current route implementations:
- `/home`
- `/lists`
- `/on-this-day`
- `/trips`
- `/albums/[albumId]`
- Updated toaster UI styling to use shared semantic tokens and remove unrelated rich status colors.
- Updated required UI docs to match current implementation:
- `docs/design-system.md`
- `docs/responsive-guidelines.md`
- `docs/ui-architecture.md`
- `docs/product/features.md`

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-29 - Editorial-Romance Shell Redesign

### Delivered
- Replaced the dashboard-like shell with a story-first editorial canvas for the authenticated app.
- Swapped typography to `Fraunces` + `Manrope` via `next/font/google`.
- Introduced richer light-only semantic tokens, gradients, paper/glass surfaces, rounded object treatments, and rose-tinted elevation.
- Reworked navigation into a floating mobile dock with centered memory action orb and a desktop rail with expandable grouped drawer.
- Rebuilt home around an anniversary spotlight, featured memory storytelling, and a vertical memory ribbon.
- Replaced generic cards with collectible memory objects and added premium shells for `/chat` and `/map`.
- Added `motion` for shared-layout transitions and shell choreography.

### Verification
- `pnpm typecheck`
- `pnpm build`

## 2026-03-29 - Documentation Reconciliation for Editorial Redesign

### Delivered
- Updated `README.md` and the product, design, UI architecture, responsive, and engineering docs to match current code.
- Documented the new editorial-romance direction, story-first home, Fraunces + Manrope typography, motion usage, and current route/navigation structure.
- Clarified implemented vs presentational routes, including `/chat`, `/map`, `/trips`, `/countdowns`, `/future-notes`, `/games`, `/stats`, and `/settings`.
- Confirmed the redesign did not add new API or database contracts.

### Verification
- Manual doc read-through against:
- `src/app/layout.tsx`
- `src/app/fonts.ts`
- `src/app/globals.css`
- `src/components/app/navigation-model.ts`
- `package.json`
