# Verified Hardening Backlog — 8 Phases, TDD, One Plan-Breaking Assumption

**Date**: 2026-06-22 07:50
**Severity**: High
**Component**: Database (RPCs, constraints, RLS), Auth/invites, Settings, Media validation, Edge-function ops
**Status**: Resolved (committed to `main` as b801e8a; e2e + build verification environment-scoped)

## What Happened

Executed `plans/260621-1909-verified-hardening-backlog/plan.md` — the verified subset of the all-features
scenario sweep, after a red-team pass and four owner decisions. Eight phases, each test-first: DB hardening
(note cap + atomic album delete), app validation (SVG deny + note Zod), timezone-change confirmation,
signed-URL TTL raise, invite email binding, couple-data erasure, the media-sweeper go-live runbook, and
deferred-items documentation. Landed as one cohesive commit to `main`. Gates: lint, typecheck, format, i18n
parity, unit 61/61, integration 36/36. The local Supabase stack was up the whole session, so the TDD loop
ran against real RLS/RPCs rather than mocks.

## The Brutal Truth

The most useful thing I did all session was refuse to trust the plan on Phase 1. The plan (and its own
red-team) had confidently dropped the `delete_empty_albums` RPC, asserting "RLS + grant already allow an
atomic app-side delete." That sentence is half true in a dangerous way: the authorization is fine, but the
_expressibility_ is not — PostgREST cannot put a correlated `NOT EXISTS` anti-join in a DELETE filter. I
almost took the plan at its word. Instead I seeded a real album and tried every supabase-js formulation
(`.is`, `.not`, `.filter` on the embedded child); all three errored with `column albums.album_items does
not exist`, and the plain delete-by-id happily removed a non-empty album — the exact data loss the phase
was meant to prevent. That two-minute empirical check turned an abstract "the plan says so" into a proven
"the plan is wrong here," which is the only basis on which I'd reverse a red-team decision. The owner
approved a small SECURITY INVOKER function, which is the correct shape: RLS still gates it, so it adds no
privileged surface — the red team's actual concern was a DEFINER RPC, not a function per se.

The concurrent-accept flake was a quieter lesson. The full integration suite went red on a test I hadn't
touched (`accept-couple-invite-concurrent-full`), and the honest move was to _prove_ it wasn't mine before
hand-waving "flaky." I reverted my Phase 1 DB objects, ran the suite without my test files, and watched it
fail anyway — pre-existing, full stop. The root cause was satisfying: the accept RPC mapped the active-role
`unique_violation` to COUPLE_FULL but not the membership trigger's `raise_exception` ("two active users"),
so under load the loser leaked a raw message. Since Phase 5 rewrote that exact RPC, folding the fix in (map
the trigger error too, re-raise anything else) was both in-scope and the thing that finally made the test
deterministic. It is a small embarrassment that the original fix only covered one of the two ways the race
resolves.

The regenerated-types dance was tedious in a way that's worth recording: `supabase gen types` emits non-null
types for nullable RPC args, so every single regen (phases 1, 5, 6) silently re-broke `update_memory_media`'s
hand-widened `| null` unions, and every time I had to re-apply them or typecheck would fail. The file even
carries a NOTE comment telling future-me to do exactly that — and I still have to remember to look. This is a
papercut that will bite the next person who regenerates without reading the diff.

## Technical Details

### Phase 1 — Note cap + atomic empty-album delete

`memories.note` CHECK at 4000 (NOT VALID + VALIDATE so the apply can't abort on a legacy long row).
`delete_empty_albums(p_couple_id, p_album_ids)` SECURITY INVOKER: one statement with an in-statement
`NOT EXISTS (album_items)` so a partner's concurrent `add_album_items` can't be lost to a stale snapshot.
`deleteEmptyAlbums` collapsed from select-then-delete into a single `rpc()` call.
**Files:** `supabase/migrations/20260621200000_*`, `20260621200500_*`, `src/app/actions/memory-actions.ts`,
`tests/integration/memory-note-length-check.test.ts`, `delete-empty-albums-atomic.test.ts`.

### Phase 2 — SVG deny + note Zod

Extracted `src/lib/media/memory-media-validation.ts` (pure) to kill three copies of the mime allowlist
across the server action, the upload hook, and the edit form. SVG (`image/svg+xml` + the `image/svg` alias)
is denied with a dedicated `memory.svgNotAllowed` message; the note cap moved to a shared
`MEMORY_NOTE_MAX_LENGTH = 4000` (raised from the prior 800 to match the DB CHECK).

### Phase 3 — Timezone-change confirmation

Inline two-step confirmation in `update-couple-timezone-form.tsx`, only for a _changed_ zone. Implemented
without `form.watch` (the React Compiler ESLint plugin rejects it as non-memoizable); editing the field
cancels the pending confirmation via the registered input's `onChange`. Updated one existing unit test and
three e2e flows that previously expected an immediate save, and added a cancel-path test.

### Phase 4 — Signed-URL TTL

`MEMORY_MEDIA_SIGNED_URL_TTL_SECONDS` 15m → 4h. One constant; unit test asserts `createSignedUrls` is called
with 14400.

### Phase 5 — Invite email binding

`couple_invites.invited_email` + a one-time cutover force-expiring outstanding unbound invites. Recreated
`accept_couple_invite` with the mismatch gate **before** COUPLE_FULL (a wrong-email stranger learns
"mismatch," never occupancy), email read from `auth.users` (DEFINER-only). A review-found null-`auth.users.email`
edge (phone/OAuth, currently disabled) is guarded explicitly so three-valued logic can't false-accept a bound
invite. Includes the concurrent-accept trigger→COUPLE_FULL fix described above.

### Phase 6 — Couple data erasure

`erase_couple_space()` SECURITY DEFINER, member-gated by deriving the couple from the caller's own active
membership. Deletes `game_rounds` first so the `game_round_*_targets → memories` ON DELETE RESTRICT FKs
cascade away before the `couples` delete frees the rest. An `information_schema` audit confirmed those two are
the only non-CASCADE FKs into any couple-scoped table. `eraseCoupleSpaceAction` wipes `memory-media` storage
by exact paths **before** the RPC (the path list lives in `memory_media`, so a crash leaves it re-readable and
the action retryable). Typed-`DELETE` danger zone; the user stays authenticated and is routed back to
onboarding to re-bootstrap.

### Phases 7–8 — Ops + docs

Media-sweeper go-live runbook in `deployment.md` (observe ≥24–48h dry-run → flip `MEDIA_SWEEPER_DELETE_ENABLED`
→ monitor → rollback). Documented the two deferred items (fixed-2 daily-question reveal vs `greatest(active,1)`;
full-timeline cursor pagination) with revisit triggers, plus a code comment at the on-this-day fetch.

## Lessons

- Verify the _mechanism_, not just the _authorization_, before trusting a "we can do this inline" claim. The
  PostgREST anti-join gap was invisible from reading RLS policies.
- When an unrelated test goes red, prove ownership by reverting your change — don't reason about it.
- `supabase gen types` + hand-widened nullable RPC args is a standing trap; the re-apply step needs a louder
  guard than a comment (a generation wrapper or a test asserting the union would be better).

## Unresolved Questions

- `pnpm build` was not run (a local scout-block hook denies the `build` command); typecheck covered the TS
  changes. Build should be confirmed in CI.
- e2e was not executed this session (owner chose unit+integration now). The Phase 3/5 specs were updated to
  match the new behavior but are unrun; a Phase 6 erase-e2e was intentionally not written because it would
  destroy the shared baseline couple — it needs dedicated worker isolation.
- The Phase 6 code review could not run as a subagent (persistent upstream 529 overload); a main-loop review
  substituted (FK-cascade audit, member-gate, retryability, search_path, gating). A fresh independent review
  is worth running when the API recovers.
- Phase 7's env flip and dry-run observation are operator actions outside the repo; only the runbook shipped.
