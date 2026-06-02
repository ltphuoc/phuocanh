# Deployment

This project has no repo-owned deployment automation. Treat this file as the minimum operational
checklist for a hosted rollout.

## Supported Shape

- Deploy the Next.js app to Vercel or another Node.js-capable host.
- Do not use static export for the current app. Auth, Server Actions, route handlers, image signing,
  and Supabase-backed server reads require a server runtime.
- Supabase owns database schema, RLS, RPCs, storage policies, Auth, cron, and the reminder Edge
  Function.

## Preflight

Run before promoting:

```bash
pnpm lint
pnpm typecheck
pnpm typecheck:functions
pnpm build
git diff --check
```

Run `pnpm test:e2e` when the change affects browser production flows, auth, routing, or critical
mutations. Record when E2E was not run.

## Where To Get Values

Use provider dashboards for real values. Keep this repo, `.env.example`, and docs placeholder-only.

| Value                            | Where to get it                                                                                   | Placeholder                                     | Used as                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Supabase Project URL             | Supabase project dashboard: **Connect** dialog or **Project Settings > API**                      | `https://<project-ref>.supabase.co`             | `NEXT_PUBLIC_SUPABASE_URL`, Edge Function `SUPABASE_URL`, Vault `project_url`         |
| Supabase anon/publishable key    | Supabase **Project Settings > API Keys** or **Connect** dialog                                    | `<anon-or-publishable-key>`                     | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Vault `anon_key`                                     |
| Supabase service role/secret key | Supabase **Project Settings > API Keys**                                                          | `<service-role-or-secret-key>`                  | App `SUPABASE_SERVICE_ROLE_KEY`, Edge Function `SUPABASE_SERVICE_ROLE_KEY`            |
| Database URL                     | Supabase **Connect** dialog; use a direct or pooler connection string as appropriate for the tool | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` | `DATABASE_URL` for SQL tooling                                                        |
| OpenAI API key                   | OpenAI platform project API keys page                                                             | `<openai-api-key>`                              | `OPENAI_API_KEY`                                                                      |
| Resend API key                   | Resend dashboard: **API Keys**                                                                    | `<resend-api-key>`                              | Edge Function `RESEND_API_KEY`                                                        |
| Reminder sender email            | Resend verified domain/sender setup                                                               | `reminders@<production-domain>`                 | Edge Function `REMINDER_FROM_EMAIL`                                                   |
| Vercel production URL            | Vercel project **Domains** or the production deployment URL                                       | `https://<production-domain>`                   | `NEXT_PUBLIC_SITE_URL`, Edge Function `REMINDER_APP_BASE_URL`, Supabase Auth Site URL |

`NEXT_PUBLIC_*` values are bundled into browser code. The Supabase anon/publishable key is expected
to be public when RLS and storage policies are correct. Service role or secret keys bypass normal
data protections and must never be placed in `NEXT_PUBLIC_*`, client/browser code, public docs,
URLs, screenshots, or client bundles.

`DATABASE_URL` is only needed for tooling in this repo unless future app code directly opens a
Postgres connection. The current app runtime uses Supabase clients instead.

Map rendering uses MapLibre GL JS with the OpenFreeMap Liberty style. No Mapbox token or public map
token is required, but hosted environments must allow outbound browser access to
`https://tiles.openfreemap.org/styles/liberty` and its referenced tile/font/sprite assets.
Place search uses the server-side `/api/geo/search` proxy to Nominatim with submit-driven searches,
per-process caching, and basic rate limiting. Hosted server environments must allow outbound HTTPS
requests to Nominatim; clients must not call Nominatim directly.

Keep `.env.local` local-first for day-to-day development and E2E runs. Hosted Supabase values belong
in Vercel/provider environment variables. Pointing `.env.local` at the hosted project is acceptable
only for an intentional smoke test, and local reset/seed/migration workflows must not be run in that
mode.

## Deploy Supabase

Supabase database migrations are deployed automatically by
`.github/workflows/deploy-supabase-migrations.yml` on pushes to `main`. The workflow links the
project, previews pending migrations, and then pushes them:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_ID"
supabase db push --dry-run
supabase db push
```

Configure these GitHub repository secrets before relying on the workflow:

| Secret                  | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI authentication token        |
| `SUPABASE_DB_PASSWORD`  | Database password for the target project |
| `SUPABASE_PROJECT_ID`   | Supabase project ref passed to `link`    |

The workflow deploys database migrations only. It does not deploy Edge Functions, Edge Function
secrets, Vault secrets, Vercel configuration, or app hosting changes.

Before merging migration changes, verify a clean local rebuild from migrations:

```bash
supabase db reset --local
```

Run Supabase deployment before Vercel so hosted app builds point at a migrated backend.

For manual migration deployment, use the same sequence as the workflow:

1. Log in and link the target project:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

2. Preview the pending remote migration plan:

   ```bash
   supabase db push --dry-run
   ```

   Stop if the dry run shows unexpected migrations or targets the wrong project.

3. Push migrations:

   ```bash
   supabase db push
   ```

4. Verify database-owned behavior against `supabase/migrations/*.sql`:
   - RLS is enabled and policies exist for app tables.
   - Storage bucket `memory-media` is private and has the migration-defined policies.
   - RPCs used by app actions and gameplay exist with expected grants.
   - Triggers exist for membership limits, timestamps, reminders, and gameplay invariants.
   - Cron jobs `phase2-reminder-enqueue` and `phase2-reminder-processor` exist.

5. If schema changes landed, regenerate the checked-in Supabase types from a migrated local stack:

   ```bash
   supabase gen types typescript --local > src/lib/supabase/database.types.ts
   ```

   Never edit `src/lib/supabase/database.types.ts` as a substitute for SQL migrations.

6. Deploy the reminder Edge Function:

   ```bash
   supabase functions deploy reminder-processor
   ```

7. Set Edge Function secrets with real values outside source control:

   ```bash
   supabase secrets set \
     SUPABASE_URL=https://<project-ref>.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=<service-role-or-secret-key> \
     RESEND_API_KEY=<resend-api-key> \
     REMINDER_FROM_EMAIL=reminders@<production-domain> \
     REMINDER_FROM_NAME=PhuocAnh \
     REMINDER_APP_BASE_URL=https://<production-domain> \
     REMINDER_LOCALE=vi
   ```

8. Set hosted Vault secrets for cron-driven function invocation:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url', 'Reminder function project URL');
   select vault.create_secret('<anon-or-publishable-key>', 'anon_key', 'Reminder function invoke key');
   ```

   If replaying locally or in CI without Vault, seed the private fallback store instead:

   ```sql
   select private.upsert_secret_fallback('project_url', '<API_URL>', 'Local functions base URL');
   select private.upsert_secret_fallback('anon_key', '<ANON_KEY>', 'Local anon key for reminder invoke');
   ```

Use [docs/migration-playbook.md](migration-playbook.md) for schema-change rules.

## Deploy Vercel

1. Create or import the Vercel project from the Git repository.
2. Set the Production branch to `main`.
3. Add Production and Preview environment variables:

   | Variable                        | Production                          | Preview                                                   | Notes                                          |
   | ------------------------------- | ----------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | `https://<project-ref>.supabase.co` | same or preview Supabase project URL                      | Browser-bundled                                |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<anon-or-publishable-key>`         | matching anon/publishable key                             | Browser-bundled                                |
   | `NEXT_PUBLIC_SITE_URL`          | `https://<production-domain>`       | preview origin or production fallback                     | Fallback for generated links                   |
   | `OPENAI_API_KEY`                | `<openai-api-key>`                  | `<openai-api-key>` or omit if not testing live generation | Server-side only                               |
   | `OPENAI_DAILY_QUESTION_MODEL`   | `gpt-4o-mini`                       | `gpt-4o-mini`                                             | Optional                                       |
   | `SUPABASE_SERVICE_ROLE_KEY`     | `<service-role-or-secret-key>`      | matching secret key or omit                               | Server-side only; never expose to browser      |
   | `DATABASE_URL`                  | optional                            | optional                                                  | Tooling only unless app code changes to use it |

   Do not set these in hosted Production or Preview environments:
   - `E2E_ENABLE_EMAIL_OTP_HELPER=true`
   - `OPENAI_DAILY_QUESTION_STUB_RESPONSE`
   - `E2E_BASE_URL`
   - `E2E_RUN_TOKEN`
   - `PLAYWRIGHT_HEADLESS`

4. Verify Vercel build settings:
   - Framework preset: Next.js
   - Package manager: `pnpm`
   - Build command: `pnpm build`
   - Output directory: Vercel default for Next.js
   - Install command: Vercel default for `pnpm`
   - Static export: disabled; this app needs a server runtime
   - Image optimization: `next.config.ts` uses `NEXT_PUBLIC_SUPABASE_URL` for Supabase media

5. Deploy a Preview build from a non-production branch or pull request.
6. Configure Supabase Auth URL settings before testing auth:
   - Site URL: `https://<production-domain>`
   - Production redirect URL: `https://<production-domain>/auth/callback`
   - Local redirect URLs:
     - `http://localhost:3000/**`
     - `http://127.0.0.1:3000/**`
   - Vercel Preview redirect URL: `https://*-<team-or-account-slug>.vercel.app/**`

7. Test the Preview deployment enough to catch env, auth, and media failures.
8. Deploy Production from `main` after Preview checks pass.

## Post-Deploy Checks

1. Request a magic-link login from the production domain and confirm the email is delivered.
2. Open the magic link and verify `/auth/callback` sets a session and redirects to the expected
   localized route.
3. Sign in as a ready user and confirm private `memory-media` images/videos render through signed
   URLs.
4. Visit `/games/daily-question` and generate a live question when `OPENAI_API_KEY` is configured.
5. In Supabase, confirm `phase2-reminder-enqueue` and `phase2-reminder-processor` exist in cron,
   then run:

   ```sql
   select public.invoke_reminder_processor();
   ```

   Confirm it returns a request ID and due rows in `public.reminder_deliveries` advance to `sent`,
   `pending`, or `failed` with retry state.

6. Check Vercel:
   - Deployment build logs show a successful `pnpm build`.
   - Runtime logs for `/auth/callback`, `/api/app-data/*`, and Server Actions have no recurring
     5xx errors.

7. Check Supabase:
   - Auth logs show expected magic-link verification.
   - Edge Function logs for `reminder-processor` show successful or explainable delivery attempts.
   - Database logs do not show repeated RLS, missing relation, missing function, or cron invocation
     errors.

## Known Constraints

- The product currently enforces one global couple space, not general multi-tenant SaaS behavior.
- `/map` uses MapLibre with the OpenFreeMap Liberty style and no public map token; route polylines are not implemented.
- Place search depends on the server-side Nominatim proxy. If OpenFreeMap or Nominatim is
  unavailable, the UI falls back to saved list/atlas data and manual typed place names.
- `/stats` is daily-question gameplay history only.
- Game slugs other than `daily-question`, `guess-date`, and `trivia` under `/games/[mode]` are not
  live backend features.
- Reminder delivery failures should stay isolated to `reminder_deliveries` retry/failure state and
  must not block app reads or writes.
