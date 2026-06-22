# Test Coverage Backfill — 7 Phases, TDD Characterization, One Stale Assumption

**Date**: 2026-06-22 11:55
**Severity**: Low
**Component**: Testing (integration/unit/Deno), Edge function (reminder-processor refactor)
**Status**: Resolved (verified green: integration 54, unit 63, deno 8, typecheck ×2, lint; commit pending owner approval)

## What Happened

Executed `plans/260622-1118-test-coverage-backfill` — regression/characterization tests for the nine
audit findings that were already implemented and verified in source but untested. Every behaviour under
test (the `update_memory_media` content invariant, the reminder dedup/claim guarantees, the couples
timezone guard, the cross-partner membership guard, `erase_couple_space` retry-safety, the create-memory
rollback, the invoke-secret gate, the unlock-email template) was written test-first and expected green;
a red result would mean a real regression. Eight new test files plus one behaviour-preserving production
refactor (Phase 5). The local Supabase stack was up throughout, so the integration TDD loop ran against
real RLS/RPCs/grants, not mocks. Gates all green; a `code-reviewer` pass confirmed the extraction is
byte-equivalent and that no test passes for the wrong reason.

## The Brutal Truth

The one moment that mattered was Phase 2's timezone test going red. The plan — citing the
`couples_reject_direct_timezone_update` trigger — asserted a direct authenticated UPDATE would surface
`TIMEZONE_UPDATE_REQUIRES_RPC`. It didn't: it surfaced `permission denied for table couples`. The easy,
wrong move would have been to "fix" the test by loosening the message match and moving on. Instead I
checked the actual grant posture and found that a _later_ migration
(`20260621140000_data_api_grants_public_tables.sql`) had narrowed `authenticated` to SELECT-only on
`couples`, so the grant layer now rejects the write before the trigger is ever evaluated. The invariant
the test exists to protect — "timezone cannot change through a direct app write" — holds harder than the
plan assumed, not weaker. The trigger is now pure defense-in-depth, and the `20260602145000` comment
("other columns stay directly updatable") is stale. The honest resolution was the one the plan itself
had already chosen for the sibling #46 case: assert the _outcome_ (rejected + value unchanged), not the
mechanism, so the test stays correct whichever layer is the active gate. Verifying the grant before
adjusting the assertion is the only thing that separates "characterization revealed a stronger guard"
from "I quietly relaxed a security test."

The quieter discipline was the stable-code-artifacts rule. I had reflexively seeded every test name and
comment with the audit finding codes (`#8`, `#16`, `#23`, …) — exactly what the rule forbids. The codes
make the plan→test mapping convenient, which is precisely why they're tempting and precisely why they
rot: a finding number means nothing to the next reader of the test. Stripping all of them and letting the
`it(...)` titles describe the behaviour directly is a small tax now that pays every time someone reads the
suite without the plan open. The traceability lives in the plan's findings table, where it belongs.

## What I'd Watch Next Time

- A plan that says "mechanism X enforces this" is a hypothesis, not a fact — especially when a later
  migration could have changed the posture. Grep the current grants/policies before asserting on a
  specific error string; prefer outcome assertions for anything guarded by overlapping grant/RLS/trigger layers.
- Hand-built Supabase mocks (Phase 6) earn trust only by asserting the _contract_ the real action
  implements (which cleanup calls fire, in what order) and nothing it doesn't — the integration suite
  carries the real-DB weight.
- The reminder-processor helpers are now unit-testable because they're side-effect-free siblings of
  `index.ts` (which calls `Deno.serve`/`env.parse` at module load). New pure logic in edge functions
  should land in such siblings from the start so `deno test` can reach it.
