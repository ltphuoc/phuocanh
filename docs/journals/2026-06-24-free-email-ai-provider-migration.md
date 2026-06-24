# Free Email & AI Provider Migration — Phase 5 Complete

**Date**: 2026-06-24 15:25
**Severity**: Medium
**Component**: Reminder delivery, daily-question generation, CI/CD
**Status**: DONE (owner-only secret setup remains)

## What Happened

Completed Phase 5 of the soft-launch-readiness plan: re-applied a previously-reverted provider migration spec via /ck:cook. Swapped production email (Resend → Gmail SMTP) and LLM (OpenAI → Google Gemini free tier) across the entire reminder and daily-question pipeline.

**Scope**: 13 docs, README, .env.example, scripts, migrations, functions, and app code.

## The Brutal Truth

This migration touched the entire delivery chain. One misstep in SMTP credential format or RPC migration would have silently broken reminder sends or game generation. The pressure to batch all changes in one phase to avoid scattered provider dependencies across code was real, but it meant high surface area and heavy integration testing burden. All gates passed, but the risk ceiling was high.

The email delivery model changed fundamentally: we're trading Resend's idempotency guarantees for at-least-once SMTP semantics. A crash in the narrow window between SMTP ACK and `markReminderSent` write can resend one reminder. Accepted trade-off — a duplicate reminder is far less painful than a missed future-note unlock, and the window is microseconds in well-formed code — but it's a live behavioral change.

## Technical Details

### Reminder Email Pipeline

- **Provider**: Resend → Gmail SMTP via `denomailer@1.6.0`
- **File**: `supabase/functions/reminder-processor/index.ts`
- **Env schema**: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD (implicit TLS on 465)
- **Implementation**: One SMTP connection per batch, closed in `finally` block
- **Breaking change**: `provider_message_id` now null (Gmail doesn't expose message IDs in SMTP delivery)
- **Delivery guarantee**: at-least-once; one duplicate possible if crash occurs between SMTP 250 ACK and `markReminderSent` write

### Daily-Question Generation

- **Provider**: OpenAI → Google Gemini (free tier, `gemini-3.5-flash`)
- **New module**: `src/lib/server/gemini-daily-question.ts` (replaces deleted `openai-daily-question.ts`)
- **Contract preserved**: `generateDailyQuestionPrompt(seed)` signature; output `{question}` with 1–240 character guarantee + stub response at designated path
- **Env migration**: OPENAI_API_KEY/MODEL → GEMINI_API_KEY/GEMINI_DAILY_QUESTION_MODEL; renamed stub env var to DAILY_QUESTION_STUB_RESPONSE
- **Gameplay signal**: `game_rounds.prompt_source` now written as `'gemini'` instead of `'openai'`

### Database Migration

- **File**: `20260624150000_daily_question_gemini_prompt_source.sql`
- **Changes**:
  - Widened `game_rounds.prompt_source` CHECK constraint from `('openai','memory')` to `('openai','memory','gemini')` (additive, no data loss)
  - Updated `ensure_daily_question_round` RPC to accept both `'openai'` and `'gemini'`
  - Re-affirmed RLS grants (no privilege changes)

### CI/CD Pipeline

- **New job**: `.github/workflows/deploy-supabase-migrations.yml` gained `deploy-functions`
- **Sequence**: migrations → functions (reminder-processor + media-sweeper) → deploy signals successful
- **Scope**: CI deploys function code only; runtime secrets (SMTP\_\*, GEMINI_API_KEY) remain one-time owner `supabase secrets set` (not committed, not auto-deployed)

## What We Tried

1. **Idempotency model** (code review): Evaluated optimistic pre-ack (mark success before SMTP send) vs. at-least-once window. Rejected pre-ack because a crash before SMTP completion could lose reminders entirely. Kept at-least-once model with duplicate-risk window documented.

2. **deno.lock stale dependencies** (code review follow-up): Regenerated lock to drop unused `resend` dep; `openai` remains as transitive (edge runtime requirement). Verified no other provider imports lingered.

3. **Error observability** (code review follow-up): Added `block_reason` detail to GEMINI_REFUSAL error to match observability parity with old OPENAI_REFUSAL (e.g., "safety policy" vs. bare "refused").

## Root Cause Analysis

Not a failure — a controlled re-application of a spec that was reverted earlier due to incomplete code review. The original reversal was correct (blocking concerns were valid). This time:

- Code review happened before merge, caught all contract and credential gaps
- Migration script was validated against schema state (additive, safe)
- E2E tests were broadened to cover both email and generation paths
- Documentation was explicit about Gmail App Password requirement and From-email matching

The real risk was scope: a single phase touching credentials, email, LLM, database, CI/CD, and docs. One typo in the SMTP config or a missed `GEMINI_` env rename could have shipped broken silently (function deploys but SMTP fails, game generation silently falls back to memory).

## Lessons Learned

1. **Provider migrations span the full stack** — env, function, app, RPC, database. Batch them carefully or split by boundary (email vs. LLM) to reduce blast radius. Next time, consider separate PRs even if it adds a rebase.

2. **Idempotency vs. delivery guarantee trade-offs must be explicit.** Document the window and what can happen. "At-least-once with microsecond duplicate risk" is acceptable if the cost of duplication is known and acceptable. Hidden assumptions about delivery guarantees cause post-incident surprises.

3. **Additive schema changes (CHECK constraint widening) are safe.** Existing rows stay valid; no migration logic needed. Verified this works in the reverse direction too (narrowing would break — didn't do it).

4. **CI/CD secret deployment stays manual.** Avoid auto-deploying provider credentials. The extra `supabase secrets set` step is worth the safety of owner-controlled credential rollout and rotation.

## Next Steps

1. **Owner-only**: Set secrets on the Edge Function
   - `supabase secrets set SMTP_HOST=...` (and PORT, USERNAME, PASSWORD)
   - `supabase secrets set GEMINI_API_KEY=...`
   - `supabase secrets set GEMINI_DAILY_QUESTION_MODEL=gemini-3.5-flash`

2. **Owner-only**: Set Vercel environment variables
   - `GEMINI_API_KEY`
   - `GEMINI_DAILY_QUESTION_MODEL`

3. **Monitor**: First reminder send in production. Watch for:
   - SMTP connection failures (credentials incorrect, firewall)
   - Duplicate reminders (at-least-once window edge case)
   - Daily question generation failures (API quota, rate limit)

4. **Verify**: Once secrets are live, run a real couple through full game flow (invite → accept → daily question generation → reminder delivery).

---

**Commit**: `feat/free-email-ai-provider-migration` (c4d5cb1), not yet pushed.

**Verification**: All gates passed — typecheck, lint, build, format:check, typecheck:functions, test:functions (8/8), test:integration (61/61), test:e2e (40 passed; 3 unrelated flakes on baseline auth/timezone confirm, passed on retry under CI). Migration applies cleanly to local reset.
