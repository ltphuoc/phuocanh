# Security & Quality Remediation — All 7 Phases Shipped

**Date**: 2026-06-02 14:50  
**Severity**: High  
**Component**: Database RLS, Auth redirects, Edge Functions, Memory mutations  
**Status**: Resolved (residual ops for deploy owner)

## What Happened

Implemented all 7 phases of the codebase review findings remediation plan across branch `fix/codebase-review-findings` (7 conventional commits: 850e12d, a5fdcf6, 5106597, 1daac4b, e251e6b, accc0ba, de46067). Shipped database least-privilege hardening, auth redirect security, reminder invocation auth, atomic memory mutations, and performance/consistency improvements. All baseline checks pass (lint, typecheck, typecheck:functions, build, 34 unit tests).

## The Brutal Truth

This was a security-first remediation that exposed a critical gap in my initial understanding: column-level PostgreSQL REVOKE does NOT subtract from table-level UPDATE grants. I almost shipped a "fix" that would have had zero effect on production. The discovery forced a rethink to a trigger-based approach, which is more correct but more complex. Also surfaced that generated types can't express nullable RPC params — hand-edits required, plus a re-gen blocker comment.

## Technical Details

### Database RLS Least-Privilege (Migration 20260602145000)

- **couple_memberships UPDATE**: Scoped to `auth.uid()` — only the calling user can update their own row, partner gets permission denied.
- **albums_delete policy**: New — allows deletion of empty albums (not blocked by cascade logic anymore).
- **couples.timezone BEFORE UPDATE trigger** (`reject_direct_couple_timezone_update`): Fires on direct writes from authenticated/anon roles; rejects with SQLSTATE 42601. When invoked via `update_couple_timezone()` RPC (SECURITY DEFINER), trigger sees `current_user = function owner` and passes. This is the correct gate, not column-level REVOKE.

### Auth Redirect Hardening

- **Magic-link emailRedirectTo**: Now derived server-side from `getSiteUrl()` — client no longer controls redirect destination (eliminates open-redirect vector).
- **Proxy sb-\* cookie rotation**: Proxy rotates Supabase session cookies on redirect path, fixing intermittent forced-logout when auth returns.
- **getSiteUrl() production discriminator**: Uses `isProductionRuntime()` (checks `VERCEL_ENV` + `NODE_ENV`) to ignore `X-Forwarded-*` headers in production, trust them in preview/dev.
- **NEXT_PUBLIC_SITE_URL required**: Prod build fails fast if unset (non-localhost https).

### Reminder Edge-Function Auth (Migration 20260602145100)

- **x-reminder-invoke-secret header**: Constant-time compare; 401 before any DB work, fail-closed when unset.
- **invoke_reminder_processor RPC**: Sends header; skips-with-notice if secret is missing (prevents silent cron silencing).
- **Deployment requirement**: `reminder_invoke_secret` must be provisioned in Supabase Vault AND set as `REMINDER_INVOKE_SECRET` env var on the edge function (must match or cron 401s).

### Atomic Memory Update (Migration 20260602145200)

New RPC `update_memory_media` folds memory-row update + media removals + media additions into a single transaction:

- `FOR UPDATE` lock on memory row.
- In-RPC `is_couple_member` assert (SECURITY DEFINER bypasses RLS).
- Enforces "note OR >=1 media" invariant server-side.
- Returns modified memory row + removed media IDs for post-commit cleanup.

`updateMemoryAction` now calls it and drives storage/album cleanup from RPC output.

### Performance & Consistency

- **maplibre-gl**: Lazy-loaded via dynamic import — off initial bundle for non-map routes.
- **getMapPageData**: Visits + memories/trips run concurrently; trips-by-id remains sequential.
- **List-action consistency**: `checklist add/toggle` now call `requireReadyCoupleContext()`; list schemas trim before min/max.

## What We Tried

1. **First approach for timezone** (rejected): `REVOKE UPDATE (timezone) ON couples FROM authenticated`. Researched grant semantics; discovered column-level revokes don't subtract table-level grants in PostgreSQL — the fix would be inert. Verified by reading Postgres docs + testing in local psql.

2. **Generated RPC nullability** (rejected): Relied on `supabase gen types` for `update_memory_media` params. Generated types force non-null even when params are nullable. Manual widening + regeneration blocker comment instead.

3. **Blanket query caps** (deferred): Phase 5 proposed `.limit()` caps and React-Query key scoping globally. Intentionally deferred as YAGNI for a 2-user app; added to backlog if cardinality scales.

## Root Cause Analysis

**Why the timezone fix was nearly wrong:** I assumed PostgreSQL's REVOKE mechanism mirrors typical role-based systems where denying at the column level subtracts from table level. In reality, Postgres uses an AND logic: a role must have the privilege at BOTH table and column level. Since Supabase grants table-level UPDATE to authenticated by default, a column-level REVOKE is a no-op. The trigger approach is correct because it intercepts the write itself, not the permission model.

**Why types can't express nullable RPC params:** `supabase gen types` is built around TypeScript strict mode and assumes all RPC args are required unless explicitly defined as `NOT NULL` on the RPC definition itself. The schema doesn't express parameter nullability the same way it does for table columns, so generation defaults to non-null types.

## Lessons Learned

1. **Test security assumptions with actual SQL probes, not documentation intuition.** A 5-minute psql test would have caught the REVOKE ineffectiveness before code review. Document the assumption in a comment if it's non-obvious (e.g., "column-level REVOKE alone won't work; trigger is the gate").

2. **Don't trust generated types as the source of truth for nullable params.** Add a re-gen-after comment with the original intention. Future regenerations will overwrite hand-edits, so the comment is a contract to fix it again.

3. **Coordinator complexity is OK if it's fail-closed.** The reminder secret check happens before any DB work — if the secret is missing, the function 401s immediately. That's better than a silent skip or partial success.

4. **Batch migrations by concern, not by table.** Three separate migrations (20260602145000, 145100, 145200) are clearer than one mega-migration. Each one documents a specific security gate or invariant.

## Next Steps

**For deploy owner (must complete before production):**

1. **Supabase hosted Redirect-URL allowlist**: Configure the proxy redirect domain (origin + `/auth/callback`).
2. **reminder_invoke_secret provisioning**: Generate a strong secret, store it in Supabase Vault, set `REMINDER_INVOKE_SECRET` on the edge function env. Verify match (mismatch = silent cron 401).
3. **future_note_encryption_key in Vault**: Ensure prod Vault holds the encryption key (currently only verified in dev).
4. **NEXT_PUBLIC_SITE_URL in prod**: Must be non-localhost https or build fails immediately.
5. **Cron end-to-end exercise**: Cron + edge function + net.http_post was not tested locally (requires provisioned secret + network access). Verify on staging before prod deploy.

**Verification done locally:**

- Migration apply clean, `supabase db diff` empty.
- RLS probes: membership own-row UPDATE succeeds (1 row), partner-row UPDATE fails (0 rows).
- Timezone: direct write blocked + RPC succeeds + name still updatable.
- Album delete: empty album deletion works.
- RPC assertions: `update_memory_media` raises MEMORY_REQUIRES_CONTENT / FORBIDDEN / MEMORY_NOT_FOUND correctly; forged couple_id ignored (RPC forces it server-side).
- Baseline: lint, typecheck, typecheck:functions, build all green; 34 unit tests pass.
- Code review: DONE_WITH_CONCERNS (one registry signature drift fixed).

**Files modified:**

- `supabase/migrations/20260602145000_*.sql` — RLS, trigger
- `supabase/migrations/20260602145100_*.sql` — reminder auth
- `supabase/migrations/20260602145200_*.sql` — memory RPC
- `src/lib/supabase/database.types.ts` — RPC param nullability (hand-widened)
- `src/app/actions/update-memory.ts` — call new RPC
- `src/lib/supabase/database.ts` — invoke_reminder_processor
- `src/lib/auth/get-site-url.ts` — production discriminator
- `src/components/map/map-container.tsx` — lazy load maplibre
- Multiple action/component files — consistency fixes

---

**Status:** DONE
