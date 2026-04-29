# Development And Verification

This guide is the compact setup and validation reference for day-to-day development. It complements the deeper product and engineering docs; it does not replace SQL migrations or runtime code as source of truth.

## Local Environment

- Copy `.env.example` to `.env.local`.
- Required app values:
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54330/postgres`
  - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Daily-question generation requires `OPENAI_API_KEY` unless `OPENAI_DAILY_QUESTION_STUB_RESPONSE` is set for local/E2E testing.
- `SUPABASE_SERVICE_ROLE_KEY` is optional for the main app; when absent, existing-couple detection falls back to the `has_any_couple()` RPC.
- Reminder delivery uses Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, plus optional reminder display/link values.

## Local Services

- Start Supabase with `supabase start`.
- Apply migrations with `supabase db reset --local`, or use `supabase db push --local` only when preserving local data matters.
- Local ports are project-specific:
  - API: `http://127.0.0.1:54331`
  - Studio: `http://127.0.0.1:54332`
  - Mailpit: `http://127.0.0.1:54333`
  - Database: `postgresql://postgres:postgres@127.0.0.1:54330/postgres`
- Local Supabase Edge Runtime is disabled in `supabase/config.toml`; hosted `reminder-processor` behavior remains part of the runtime contract.

## App Startup

- Install with the pinned package manager from `package.json`: `pnpm@10.29.2`.
- Run the app with `pnpm dev`.
- Next.js 16 uses Turbopack by default for `next dev` and `next build` in this repo.
- The app is locale-prefixed for user-facing routes (`/vi/*`, `/en/*`), with `/` acting as a redirect-only entry.

## Verification Commands

- Baseline:
  - `pnpm test:unit`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm typecheck:functions`
  - `pnpm build`
  - `git diff --check`
- Internationalization changes also need:
  - `pnpm i18n:check`
  - `pnpm i18n:audit-hardcoded`
- Schema changes also need local migration application and synced Supabase TypeScript types as described in `docs/engineering/migration-playbook.md`.

## E2E Harness

- Run production-flow browser coverage with `pnpm test:e2e`.
- Use `pnpm test:e2e:headed` only when interactive browser debugging is needed.
- The harness starts a dedicated production server at `http://127.0.0.1:3100` by default, resets the local database, enables the loopback-only OTP helper, and stubs daily-question prompt generation.
- The suite intentionally excludes shell-only game modes other than `daily-question`, `guess-date`, and `trivia`.

## Docs Update Rules

- Update `docs/engineering/route-capability-matrix.md` whenever route status changes.
- Update `docs/product/business-rules.md` and `docs/engineering/api-contracts.md` when behavior, validation, RPCs, or mutation contracts change.
- Keep `docs/changelog/implementation-log.md` historical; add a new entry for new work instead of rewriting old entries.
- Do not report historical verification as fresh. If `pnpm test:e2e` is not run in the current change, say it was not run.
