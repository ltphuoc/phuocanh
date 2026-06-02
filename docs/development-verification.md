# Development And Verification

This is the canonical local setup, environment, command, testing, and docs-update guide. It
complements source-of-truth SQL migrations and runtime code; it does not replace them.

## Prerequisites

- `pnpm@10.29.2` from `package.json`
- Supabase CLI and Docker for the local Supabase stack
- Deno for `pnpm typecheck:functions`
- Node.js compatible with the installed Next.js toolchain

## Local Environment

Copy `.env.example` to `.env.local` for normal local development. Next.js loads env files from the
repo root. Values prefixed with `NEXT_PUBLIC_` are exposed to browser code and are evaluated at
build time.

Default `.env.local` values should point at the local Supabase stack. Use hosted Supabase values in
Vercel/provider environment variables, or only in `.env.local` for an intentional local smoke test
against the deployed project. Do not run local reset, migration-push, or E2E workflows against a
deployed database.

| Variable                              | Required    | Used by                   | Notes                                                                  |
| ------------------------------------- | ----------- | ------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | yes         | app, browser, server      | Local value: `http://127.0.0.1:54331`                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | yes         | app, browser, server      | Supabase anon key                                                      |
| `DATABASE_URL`                        | yes         | SQL tooling               | Local value: `postgresql://postgres:postgres@127.0.0.1:54330/postgres` |
| `NEXT_PUBLIC_SITE_URL`                | yes         | auth redirects, links     | Local default: `http://localhost:3000`                                 |
| `OPENAI_API_KEY`                      | conditional | daily-question generation | Required unless using the local/E2E stub                               |
| `OPENAI_DAILY_QUESTION_MODEL`         | no          | daily-question generation | Defaults to `gpt-4o-mini` in app code                                  |
| `OPENAI_DAILY_QUESTION_STUB_RESPONSE` | test only   | local/E2E                 | Skips OpenAI calls with a fixed prompt                                 |
| `SUPABASE_SERVICE_ROLE_KEY`           | no          | auth gate fast path       | Runtime falls back to `has_any_couple()` when unset                    |
| `E2E_ENABLE_EMAIL_OTP_HELPER`         | test only   | local E2E                 | Never enable in hosted environments                                    |

## Reminder Environment

The app runtime and the reminder Edge Function do not use the same secret set.

Edge Function secrets for `supabase/functions/reminder-processor`:

| Secret                      | Required | Purpose                                         |
| --------------------------- | -------- | ----------------------------------------------- |
| `SUPABASE_URL`              | yes      | Supabase project URL inside the Edge Function   |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | Claims and updates `reminder_deliveries`        |
| `RESEND_API_KEY`            | yes      | Outbound email provider                         |
| `REMINDER_FROM_EMAIL`       | yes      | Sender address                                  |
| `REMINDER_FROM_NAME`        | no       | Sender display name, defaults to `PhuocAnh`     |
| `REMINDER_APP_BASE_URL`     | no       | Public app base URL for reminder links          |
| `REMINDER_LOCALE`           | no       | Link locale prefix, defaults to `vi`            |
| `REMINDER_INVOKE_SECRET`    | yes      | Shared secret for cron invocation authorization |

Hosted reminder cron invocation also needs Supabase Vault secrets:

| Vault secret                 | Required | Purpose                                     |
| ---------------------------- | -------- | ------------------------------------------- |
| `project_url`                | yes      | Base project URL used by `pg_net`           |
| `anon_key`                   | yes      | Scheduled invoke bearer token               |
| `reminder_invoke_secret`     | yes      | Shared secret for cron invoke authorization |
| `future_note_encryption_key` | yes      | At-rest future note body encryption key     |

Local/CI replay can use the private fallback secret store documented in
[docs/deployment.md](deployment.md).

## Local Services

```bash
supabase start
supabase db reset --local
pnpm dev
```

Use `supabase db push --local` only when preserving local data matters.

| Service         | URL                                                       |
| --------------- | --------------------------------------------------------- |
| Supabase API    | `http://127.0.0.1:54331`                                  |
| Supabase Studio | `http://127.0.0.1:54332`                                  |
| Mailpit         | `http://127.0.0.1:54333`                                  |
| Database        | `postgresql://postgres:postgres@127.0.0.1:54330/postgres` |

For normal local development, `NEXT_PUBLIC_SUPABASE_URL` must point to
`http://127.0.0.1:54331`. The ports intentionally avoid the default Supabase local ports.

Local Supabase Edge Runtime is disabled in `supabase/config.toml` because the current local relay
can fail before booting in this environment. Hosted `reminder-processor` behavior remains part of
the runtime contract.

## App Startup

- User-facing routes are locale-prefixed (`/vi/*`, `/en/*`); `/` is a redirect-only entry.
- Run `pnpm dev` for local work.
- Run `pnpm build` and `pnpm start` for production-mode checks.
- Next.js 16 uses Turbopack by default for local development in this repo; read the bundled
  version-matched docs under `node_modules/next/dist/docs/` before changing Next.js APIs or config.

## Verification Commands

| Command                     | Run when                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| `pnpm format:check`         | Docs/code formatting validation                                    |
| `pnpm test:unit`            | Logic, utility, form, or query-cache changes                       |
| `pnpm lint`                 | Every PR baseline                                                  |
| `pnpm typecheck`            | Every PR baseline                                                  |
| `pnpm typecheck:functions`  | Edge Function, reminder contract, or reminder docs changes         |
| `pnpm build`                | Every PR baseline                                                  |
| `git diff --check`          | Every PR baseline                                                  |
| `pnpm i18n:check`           | Translation key or locale changes                                  |
| `pnpm i18n:audit-hardcoded` | User-visible copy changes                                          |
| `pnpm test:e2e`             | Browser production-flow, auth, route, or critical mutation changes |

Baseline before PRs:

```bash
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

Also run `pnpm typecheck:functions` when Supabase Edge Functions or reminder docs/contracts are
touched. Do not claim a fresh E2E result unless `pnpm test:e2e` was actually run in the current
change.

## E2E Harness

Production-flow browser coverage lives under `tests/e2e/*` and runs against `next build` plus
`next start`, not the dev server.

```bash
pnpm test:e2e
pnpm test:e2e:headed
```

The harness:

- starts local Supabase if needed
- resets the local database with migrations and `supabase/seed.sql`
- builds the app
- starts a dedicated server at `E2E_BASE_URL`, default `http://127.0.0.1:3100`
- enables the loopback-only OTP helper for local auth bootstrap
- stubs daily-question prompt generation through `OPENAI_DAILY_QUESTION_STUB_RESPONSE`
- writes Playwright auth state under `playwright/.auth/`

The suite covers implemented backend-backed routes only. Game slugs other than `daily-question`,
`guess-date`, and `trivia` are intentionally excluded.

## Internationalization

- Locales: `vi` default, `en` supported
- Locale routes: always prefixed
- Locale priority: `NEXT_LOCALE` cookie, browser `Accept-Language`, then `vi`
- Canonical key set: `messages/en.json`
- Vietnamese overrides: `messages/vi.json`
- Runtime fallback: missing locale keys fall back to English through `src/i18n/request.ts`

For a new language:

1. Add the locale and display label in `src/i18n/routing.ts`.
2. Create `messages/<locale>.json` from the English key set.
3. Run `pnpm i18n:check`, `pnpm i18n:audit-hardcoded`, and `pnpm typecheck`.

For a new key:

1. Add the key to `messages/en.json` first.
2. Add the localized value to `messages/vi.json`, or temporarily rely on English fallback.
3. Use feature-first namespaces such as `auth.*`, `forms.*`, `actions.*`, `nav.*`, and `ui.*`.
4. Keep toast/action keys under `actions.*`; UI should render translation keys, not raw backend
   messages.

## Docs Update Rules

- Update `docs/route-capability-matrix.md` whenever route status changes.
- Update `docs/product/business-rules.md` and `docs/api-contracts.md` when behavior,
  validation, RPCs, or mutation contracts change.
- Update `docs/deployment.md` when hosted setup, secrets, cron, or rollout steps change.
- Keep `docs/changelog/implementation-log.md`, `docs/product/user-decisions.md`, and
  `docs/tech-decisions.md` historical. Do not use older log entries as current source
  of truth.
