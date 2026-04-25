# PhuocAnh Couple App

Private couple memory web app built with Next.js App Router + Supabase.

## Current Product State
- `implemented`: `/`, `/login`, `/onboarding`, `/accept-invite`, `/auth/callback`, `/home`, `/lists`, `/memories/new`, `/memories/[memoryId]`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, `/albums/[albumId]`, `/map`, `/games`, `/games/daily-question`, `/stats`, `/settings`
- `shell-only`: non-`daily-question` slugs under `/games/[mode]`
- internal-only route handlers also exist at `/auth/callback/verify-email-otp` for local Playwright auth bootstrap when explicitly enabled from a loopback host

Use `docs/engineering/route-capability-matrix.md` as the canonical current-state route map.

## Source Of Truth
1. Business rules: `docs/product/business-rules.md`
2. Schema and security: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` and `docs/engineering/api-contracts.md`
4. UI behavior and route status: `docs/engineering/frontend-architecture.md` and `docs/engineering/route-capability-matrix.md`
5. Historical logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage behavior, trust SQL.

## Start Here
- Agent handbook: `docs/agent/agent-handbook.md`
- Business rules: `docs/product/business-rules.md`
- User flows: `docs/product/flows.md`
- System architecture: `docs/engineering/system-architecture.md`
- Frontend architecture: `docs/engineering/frontend-architecture.md`
- Development and verification: `docs/engineering/development-verification.md`
- Migration rules: `docs/engineering/migration-playbook.md`
- Route capability matrix: `docs/engineering/route-capability-matrix.md`

## Getting Started
1. Copy `.env.example` to `.env.local`.
2. Fill the required values:

| Variable | Required now | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser/server anon key for current runtime |
| `DATABASE_URL` | yes | Local SQL tooling and schema parity work |
| `NEXT_PUBLIC_SITE_URL` | yes | Fallback site URL when forwarded headers are absent |
| `OPENAI_API_KEY` | conditional | Required to generate daily-question prompts in `/games/daily-question` |
| `OPENAI_DAILY_QUESTION_MODEL` | optional | Prompt-generation model override; defaults to `gpt-4o-mini` |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Enables the admin-backed auth-gate fast path for existing-couple detection; when unset, the main app falls back to the authenticated `has_any_couple()` RPC |

Phase 2 reminder delivery also needs Edge Function secrets when you deploy or serve `supabase/functions/reminder-processor`:

| Secret | Required now | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL inside the Edge Function runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Claims and updates `reminder_deliveries` inside the Edge Function |
| `RESEND_API_KEY` | yes | Outbound reminder email provider |
| `REMINDER_FROM_EMAIL` | yes | Sender address for reminder emails |
| `REMINDER_FROM_NAME` | optional | Sender display name, defaults to `PhuocAnh` |
| `REMINDER_APP_BASE_URL` | optional | Public app base URL used for reminder deep links |
| `REMINDER_LOCALE` | optional | Locale prefix used in reminder deep links, defaults to `vi` |

In hosted environments, Phase 2 reminder delivery also needs these Supabase Vault secrets for cron-triggered Edge Function invocation:

| Vault secret | Required now | Purpose |
|---|---|---|
| `project_url` | yes | Base project URL used by `pg_net` to call the reminder Edge Function |
| `anon_key` | yes | Supabase anon key used as the scheduled invoke bearer token |

For local Supabase Docker setup, use:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54330/postgres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Keep your browser URL consistent with auth redirect config. This repo supports both:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

3. Start local Supabase:
```bash
supabase start
```

This repo currently disables local Supabase Edge Runtime by default because the
current Supabase CLI local relay imports `jsr:@panva/jose@6`, and `jsr.io`
returns a `403` challenge in this environment during boot. The hosted
`reminder-processor` Edge Function remains part of the runtime contract; only
local auto-boot is disabled for now.

Local Supabase service endpoints for this repo:

| Service | URL |
|---|---|
| Project URL | `http://127.0.0.1:54331` |
| Studio | `http://127.0.0.1:54332` |
| Mailpit | `http://127.0.0.1:54333` |
| MCP | `http://127.0.0.1:54331/mcp` |
| REST | `http://127.0.0.1:54331/rest/v1` |
| GraphQL | `http://127.0.0.1:54331/graphql/v1` |
| Database URL | `postgresql://postgres:postgres@127.0.0.1:54330/postgres` |

`NEXT_PUBLIC_SUPABASE_URL` must point to `http://127.0.0.1:54331`.

These local ports are intentionally different from the default Supabase ports to avoid conflicts with another local stack already using `54321`, `54322`, `54323`, `54324`, and `54327`.

4. Apply local database migrations:
```bash
supabase db reset --local
```

If you need to preserve local data, use:
```bash
supabase db push --local
```

5. Run the app:
```bash
pnpm dev
```

## Validation
Run all of these before opening a PR:
```bash
pnpm lint
pnpm typecheck
pnpm typecheck:functions
pnpm build
```

## E2E Validation
Production-flow browser coverage now lives in Playwright and runs against `next build` + `next start` on the local Supabase stack.

Prerequisites:
- Docker Desktop is installed and the Docker daemon is running
- local Supabase is installed and available on your `PATH`
- `.env.local` contains the local Supabase URL/keys and site URL values above
- local auth email capture is available through Mailpit on `http://127.0.0.1:54333`
- no other process is required to own the E2E app port; the harness starts its own dedicated server at `http://127.0.0.1:3100` by default

Commands:
```bash
pnpm test:e2e
pnpm test:e2e:headed
```

What `pnpm test:e2e` does:
- starts local Supabase if needed
- resets the local database with migrations and the baseline seed file
- builds the Next.js app
- runs Playwright serially against `E2E_BASE_URL`, which defaults to `http://127.0.0.1:3100`

Local E2E note:
- `supabase start` intentionally skips local Edge Runtime right now, so the
  local stack used by Playwright covers DB, Auth, Storage, Studio, Mailpit, and
  the app runtime, but not `/functions/v1`.

E2E-specific runtime notes:
- `E2E_ENABLE_EMAIL_OTP_HELPER` explicitly enables the internal `POST /auth/callback/verify-email-otp` helper used by local Playwright auth bootstrap. The route still returns `404` unless the request also comes through `127.0.0.1`, `localhost`, or another loopback host.
- `OPENAI_DAILY_QUESTION_STUB_RESPONSE` is a test-only override for `/games/daily-question` prompt generation. When unset, the app uses the normal OpenAI Responses API path.
- `scripts/e2e/run.sh` defaults `E2E_BASE_URL=http://127.0.0.1:3100`, aligns `NEXT_PUBLIC_SITE_URL` to that URL, and also sets `E2E_ENABLE_EMAIL_OTP_HELPER`, `OPENAI_DAILY_QUESTION_STUB_RESPONSE`, and `TZ=Asia/Ho_Chi_Minh`.
- Playwright auth state files are written under `playwright/.auth/` and are gitignored.
- The suite intentionally excludes shell-only game modes under `/games/[mode]`.
- Historical verified local result from the post-Phase 3 Slice 1 E2E hardening wave: `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:functions`, `pnpm build`, `pnpm test:e2e`, and `git diff --check` all passed; Playwright finished `7 passed (2.8m)`.

## Reminder Setup Verification
After deploying the migration and the `reminder-processor` Edge Function, verify:
1. Hosted: Vault contains `project_url` and `anon_key`. Local/CI without Vault: seed the fallback store instead:
   `select private.upsert_secret_fallback('project_url', '<API_URL>', 'Local functions base URL');`
   `select private.upsert_secret_fallback('anon_key', '<ANON_KEY>', 'Local anon key for reminder invoke');`
   Use `supabase status -o env` to get `API_URL` and `ANON_KEY`.
2. Cron contains `phase2-reminder-enqueue` and `phase2-reminder-processor`.
3. `select public.invoke_reminder_processor();` returns a request ID.
4. Due reminders appear in `public.reminder_deliveries` and advance to `sent` or retry state.

## Internationalization (next-intl)
- Locales: `vi` (default), `en`
- Locale routes: all user-facing pages are locale-prefixed (`/vi/*`, `/en/*`)
- Locale selection priority: `NEXT_LOCALE` cookie -> browser `Accept-Language` -> `vi`
- Message files:
  - `messages/en.json` (canonical key set)
  - `messages/vi.json` (localized overrides)
- Runtime fallback: missing locale keys fall back to English via deep merge in `src/i18n/request.ts`

### Add a new language
1. Add locale to `src/i18n/routing.ts` in `locales`.
2. Create `messages/<locale>.json`.
3. Start from `messages/en.json` keys and translate values.
4. Add locale display label in `src/i18n/routing.ts` (`localeDisplayNames`).
5. Run:
```bash
pnpm i18n:check
pnpm i18n:audit-hardcoded
pnpm typecheck
```

### Add a new translation key
1. Add the key to `messages/en.json` first (canonical source).
2. Add translated value to `messages/vi.json` (or rely on temporary English fallback).
3. Use nested reusable keys (e.g. `auth.login.title`, `forms.memory.submit`, `actions.memory.created`).
4. Reference keys via scoped translators (`useI18n(\"forms.memory\")`, `getTranslations({namespace: \"home\"})`).
5. Re-run `pnpm i18n:check` and `pnpm typecheck`.

### Naming conventions
- Use feature-first namespaces: `auth.*`, `forms.*`, `actions.*`, `nav.*`, `ui.*`.
- Prefer stable reusable keys over route-specific one-offs.
- Use ICU messages for counts/plurals (example: `ui.countdown.daysLeft`).
- Keep action/toast keys under `actions.*`; UI should render keys, not raw backend messages.

## Notes
- Current UI direction is editorial-romance, light-mode only, with `Fraunces` + `Manrope` and a floating dock / rail shell.
- The deprecated `/chat` mock route has been removed; do not reintroduce live chat without a new product plan.
- Shell-only routes are intentionally not evidence of backend/domain support.
- Current runtime uses the OpenAI Responses API for `/games/daily-question` prompt generation and has no live Mapbox integration.
- `/map` is now backed by real trip-linked `visited_places` data, but it remains provider-free and does not render geographic tiles or coordinates yet.
- `/settings` now owns the shared couple timezone, which drives countdown, future-note, trip-status, album-eligibility, and other couple-level day boundaries.
- Gameplay writes are RPC-only and raw `game_round_answers` rows are not directly browser-readable; reveal state flows through secure server read helpers.
- Phase 2 reminder automation is now part of the runtime contract. Database cron jobs enqueue reminder rows, and the `reminder-processor` Edge Function delivers summary-only emails through Resend.

## Deploy On Vercel
The repo does not currently define project-specific deployment automation. If deployment work is requested, document the exact environment and rollout steps in the same PR.
