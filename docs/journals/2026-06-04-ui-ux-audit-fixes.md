# UI/UX Audit Fixes — One-Liner Default Flip, Big Blast-Radius Illusion

**Date**: 2026-06-04 15:30
**Severity**: Low (polish + accessibility completeness)
**Component**: Frontend UI system, form validation, navigation, component contracts
**Status**: Resolved

## What Happened

Three-pass UI audit (ui-ux-pro-max + Vercel Web Interface Guidelines) surfaced 12 findings across form validation states, navigation affordance, internationalization, and component defaults. A targeted remediation pass landed 6 concrete fixes across 10 files (+41/-13) in commit `b846927`. All tests green, build passes, i18n keys balanced (756 keys, 0 missing). Code review clean.

## The Brutal Truth

The scariest part of the plan was the `SectionCard` `hoverLift` default flip. The component has 65 call sites. Flipping a default from `true` to `false` looked like it would require hand-auditing every one, marking dozens of clickable cards with `hoverLift={true}`, and touching 11+ files. This felt like a time sink masquerading as a small fix.

The audit proved otherwise: **no `SectionCard` is actually clickable.** None has `onClick`. None wraps a link directly. The genuinely clickable cards (`album-card`, `trip-card-template`) put their hover-lift on the outer `Link` wrapper, not the inner card. The blast-radius number (65 usages) wasn't a measure of true change size — it was a prompt to audit the interaction contract first. Auditing the contract collapsed "touch ~11 files" into a **one-line default flip**, which also surfaced and fixed a pre-existing redundant double-lift on those cards.

The fix itself was clean. The lesson burned deeper: big usage counts are invitations to question assumptions, not evidence of large changes.

## Technical Details

- **aria-invalid styling**: Wired visible `border-red-500` + `ring-red-200` on `Input`/`Textarea`/`Select` when `aria-invalid="true"`. Completes a pattern already threaded through form validation schemas.
- **hoverLift default inverted**: `SectionCard` `hoverLift` now `false` by default (opt-in, not opt-out). Removed false affordance where cards hovered even when not clickable. Bonus: eliminated redundant double-lift on album/trip cards.
- **Navigation link affordance**: Added `hover:text-foreground` to inactive side + bottom nav links (was `hover:text-muted-foreground`). Stronger visual feedback on interaction.
- **Brand mark translation barrier**: Added `translate="no"` to `PhuocAnh` / `P&A` brand marks in layout + side-navigation. Prevents auto-translation tools from mangling the logotype.
- **Loading state copy**: Localized loading ellipsis from hardcoded `Loading…` to keyed `Loading…` (en) / `Đang tải…` (vi). Applied across titles, not just inline spinners.
- **Accessibility polish**: Global button rule `button:not(:disabled){cursor:pointer}` (ensures no disabled buttons appear interactive); dock label padding 10px → 11px (minor but consistent with rhythm).

## What We Tried

- **Scope decision on dark mode**: Flagged in audit, deferred to dedicated plan. Session scope was strict: light-mode visual fixes only.
- **autoComplete="off" contention**: Audit flagged forms rejecting `off` on non-auth fields. Researched Vercel WIG endorsement: `off` is correct for non-auth fields (prevents password managers interfering). Login form explicitly overrides to `email`. Finding withdrawn.

## Root Cause Analysis

The `SectionCard` scare was a mismatch between **call-site count** and **change blast radius**. Sixty-five instances of a component suggested widespread impact, but the actual contract—whether a card component should lift on hover—hinged on whether cards were ever clickable surfaces. The audit required reading the interaction model (they aren't), not counting usages. This flipped the work from days to minutes.

## Lessons Learned

1. **Blast-radius numbers are not change-size proxies.** A component with 65 call sites can change in a one-liner if the contract is simple. Audit the interaction model first, then count.

2. **Hover affordance is a contract, not a visual default.** If no card in the codebase is clickable, hover effects are noise. Make them opt-in. (Bonus lesson: this caught a real bug — the album/trip cards were lifting twice.)

3. **Localization keys should thread through loading states consistently.** Loading spinners and loading titles are part of the same UX moment; they should use the same i18n contract, not hardcoded strings.

4. **Minor padding rhythms matter.** 10px → 11px on the dock label isn't flashy, but it's the difference between "this looks slightly off" and "I didn't notice." Document these ratios in the design system.

## Next Steps

1. **Dark mode audit fixes** — defer to dedicated plan (confirmed with user; out of scope for light-mode pass)
2. **game-card-template.tsx removal** — flagged as dead code during audit. Separate cleanup task.
3. **Verification baseline**: `pnpm lint`, `pnpm typecheck`, `pnpm i18n:check` (756/756 keys), `pnpm build` (24 routes), `pnpm test` (34/34 unit tests passing), code review pass — all green on commit `b846927`.

---

**Status:** RESOLVED (6/6 fixes shipped, 2 audit follow-ups deferred/separated per user decision. Production-ready; no breaking changes.)
