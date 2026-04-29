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

## App Environment

Set these in the hosted app environment before `pnpm build`:

| Variable                        | Required    | Notes                                                         |
| ------------------------------- | ----------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes         | Hosted Supabase project URL; exposed to browser code          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes         | Hosted anon key; exposed to browser code                      |
| `NEXT_PUBLIC_SITE_URL`          | yes         | Public app origin used for redirects and links                |
| `OPENAI_API_KEY`                | conditional | Required for live `/games/daily-question` prompt generation   |
| `OPENAI_DAILY_QUESTION_MODEL`   | no          | Defaults to `gpt-4o-mini`                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | no          | Enables the auth-gate fast path; never expose to browser code |

Never set `E2E_ENABLE_EMAIL_OTP_HELPER=true` in hosted environments.

Configure Supabase Auth so the public site URL and callback URL are allowed:

- `<PUBLIC_APP_ORIGIN>`
- `<PUBLIC_APP_ORIGIN>/auth/callback`

## Next.js App

For a Node.js host:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

For Vercel, keep the default framework integration and the package manager pinned by
`packageManager` in `package.json`.

## Supabase Database And Storage

1. Link the local repo to the target Supabase project.
2. Apply SQL migrations from `supabase/migrations/*.sql`.
3. Confirm the private `memory-media` bucket, storage policies, RLS policies, triggers, and RPCs
   match the migrations.
4. If schema changes landed, regenerate or manually sync `src/lib/supabase/database.types.ts` after
   applying SQL locally; never edit the type mirror alone.

Use [docs/engineering/migration-playbook.md](migration-playbook.md) for schema-change rules.

## Reminder Edge Function

Deploy `supabase/functions/reminder-processor` and set:

| Secret                      | Required | Purpose                                  |
| --------------------------- | -------- | ---------------------------------------- |
| `SUPABASE_URL`              | yes      | Supabase project URL inside the function |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | Claims and updates delivery rows         |
| `RESEND_API_KEY`            | yes      | Outbound email provider                  |
| `REMINDER_FROM_EMAIL`       | yes      | Sender address                           |
| `REMINDER_FROM_NAME`        | no       | Sender display name                      |
| `REMINDER_APP_BASE_URL`     | no       | Public app base URL for reminder links   |
| `REMINDER_LOCALE`           | no       | Link locale prefix                       |

Hosted cron invocation also needs Vault secrets:

| Vault secret  | Required | Purpose                                   |
| ------------- | -------- | ----------------------------------------- |
| `project_url` | yes      | Base URL for `pg_net` function invocation |
| `anon_key`    | yes      | Scheduled invoke bearer token             |

Local or CI replay without Vault can seed the fallback secret store:

```sql
select private.upsert_secret_fallback('project_url', '<API_URL>', 'Local functions base URL');
select private.upsert_secret_fallback('anon_key', '<ANON_KEY>', 'Local anon key for reminder invoke');
```

Use `supabase status -o env` locally to find `API_URL` and `ANON_KEY`.

## Post-Deploy Checks

Verify:

1. The app can complete magic-link login through `/auth/callback`.
2. Authenticated users resolve to the correct onboarding, invite, or ready state.
3. Storage-backed memories render signed media URLs.
4. `/games/daily-question` can generate a live prompt when `OPENAI_API_KEY` is set.
5. `phase2-reminder-enqueue` and `phase2-reminder-processor` exist in cron.
6. `select public.invoke_reminder_processor();` returns a request ID.
7. Due reminders appear in `public.reminder_deliveries` and advance to `sent` or retry state.

## Known Constraints

- The product currently enforces one global couple space, not general multi-tenant SaaS behavior.
- `/map` is provider-free; there is no Mapbox, tile, coordinate, or route-polyline deployment setup.
- `/stats` is daily-question gameplay history only.
- Game slugs other than `daily-question`, `guess-date`, and `trivia` under `/games/[mode]` are not
  live backend features.
- Reminder delivery failures should stay isolated to `reminder_deliveries` retry/failure state and
  must not block app reads or writes.
