# PhuocAnh Couple App

Private couple memory web app built with Next.js App Router + Supabase.

## Current Product State
- `implemented`: `/login`, `/accept-invite`, `/auth/callback`, `/home`, `/lists`, `/memories/new`, `/memories/[memoryId]`, `/on-this-day`
- `shell-only`: `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, `/future-notes`, `/games`, `/games/[mode]`, `/stats`, `/settings`
- `mock-only`: `/chat`

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
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Reserved for future trusted server/admin tasks; current runtime does not require it |

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
pnpm build
```

## Notes
- Current UI direction is editorial-romance, light-mode only, with `Fraunces` + `Manrope` and a floating dock / rail shell.
- `/chat` is mock-only because it renders sample conversation content, not real messages.
- Shell-only routes are intentionally not evidence of backend/domain support.
- Current runtime has no live OpenAI integration and no live Mapbox integration.

## Deploy On Vercel
The repo does not currently define project-specific deployment automation. If deployment work is requested, document the exact environment and rollout steps in the same PR.
