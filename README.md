# PhuocAnh Couple App

Private couple memory web app built with Next.js App Router + Supabase.

## Current Product State
- `implemented`: `/`, `/login`, `/onboarding`, `/accept-invite`, `/auth/callback`, `/home`, `/lists`, `/memories/new`, `/memories/[memoryId]`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, `/albums/[albumId]`, `/map`, `/settings`
- `shell-only`: `/games`, `/games/[mode]`, `/stats`
- `mock-only`: `/chat` (deprecated mock artifact pending cleanup)

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
| `SUPABASE_SERVICE_ROLE_KEY` | conditional | Required by the `reminder-processor` Edge Function; not required for the main Next.js runtime |

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
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Keep your browser URL consistent with auth redirect config. This repo supports both:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

3. Start local Supabase:
```bash
supabase start
```

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
- `/chat` is a deprecated mock artifact because it renders sample conversation content, not real messages, and is no longer on the roadmap.
- Shell-only routes are intentionally not evidence of backend/domain support.
- Current runtime has no live OpenAI integration and no live Mapbox integration.
- `/map` is now backed by real trip-linked `visited_places` data, but it remains provider-free and does not render geographic tiles or coordinates yet.
- `/settings` now owns the shared couple timezone, which drives countdown, future-note, trip-status, album-eligibility, and other couple-level day boundaries.
- Phase 2 reminder automation is now part of the runtime contract. Database cron jobs enqueue reminder rows, and the `reminder-processor` Edge Function delivers summary-only emails through Resend.

## Deploy On Vercel
The repo does not currently define project-specific deployment automation. If deployment work is requested, document the exact environment and rollout steps in the same PR.
