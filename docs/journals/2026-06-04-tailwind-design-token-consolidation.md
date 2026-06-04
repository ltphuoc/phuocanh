# Tailwind Design Token Consolidation — The @theme CSS-First Gamble and the color-mix Trap

**Date**: 2026-06-04 18:45
**Severity**: Medium (refactor, no behavior change, enforcement added)
**Component**: Design system, Tailwind v4 CSS-first config, ESLint rules
**Status**: Resolved

## What Happened

Consolidated ~280 arbitrary Tailwind utilities across 47 files into reusable `@theme` design tokens (Next.js 16 + Tailwind v4 CSS-first). Commit `74dee33`. Introduced 7-step font-size scale, three shadow tokens, opacity modifiers on color vars, and a new local ESLint rule (`design-tokens/no-arbitrary`) to prevent future arbitrary creep. All tests pass, build clean, linting passes.

## The Brutal Truth

The scariest moment came **after** shipping the color `/alpha` modifiers to production. A quick grep on minified CSS showed inline-color var fallbacks without any `color-mix()` rule visible. This looked like a **translucency parity regression** — the original arbitrary `rgba(0,0,0,0.78)` was gone, replaced only with a bare `var(--bg-soft)`. My confidence in the refactor tanked. I was genuinely concerned we'd broken opacity handling for shipping.

Turns out? The CSS was correct the entire time. Tailwind v4's `@supports` progressive-enhancement output generates **two rules per var-alpha combo** — the fallback for ancient browsers AND the `color-mix(in oklab, var(...) NN%, transparent)` override for moderns. Grep on minified CSS only showed the first rule because it was the first match. I needed to account for the dual-rule pattern before concluding a regression existed.

This cost 30 minutes of thrashing and a code-review escalation. The lesson isn't "grep is bad" — it's "compiled CSS from Tailwind v4 hides complexity in @supports, and a single match doesn't tell the full story."

## Technical Details

**Phase-by-phase rollout with `pnpm build` gate:**

1. **Token definitions** — 7-step font-size scale (`text-2xs` through `text-display-sm`), deliberately NO companion `--line-height` vars (preserves font-size-only contract of original `text-[Nrem]` arbitraries)
2. **Mechanical renames** — `text-[1rem]` → `text-base`, etc.
3. **Typography tokens** — `tracking-meta`, `text-display-sm` across 12 files
4. **Color consolidation** — Brand tokens + `/alpha` modifier syntax; e.g., `bg-bg-soft/78` compiles to fallback `var(--color-bg-soft)` + @supports rule with `color-mix(in oklab, var(--color-bg-soft) 22%, transparent)`
5. **Radius tokens** — `--radius-card`, left layout one-offs (rounded-[inherit], rounded-[calc()]) untouched
6. **Shadow tokens** — Three `--shadow-focus-*` variants
7. **ESLint guard** — New `design-tokens/no-arbitrary` rule (error-level, `src/**/*.{ts,tsx}` scope only)

**Layout exclusions (intentionally arbitrary):** `min-h-[100svh]`, `top/left` insets, `aspect-*`, `grid-cols-*`, `w-[min()]`, `rounded-[inherit|calc()]`. These are one-off constraints, not repeatable design tokens.

**Color-mix CSS pattern (the trap):**

```css
/* Fallback for old browsers */
.bg-bg-soft\/78 {
  background-color: var(--color-bg-soft);
}

/* Override in modern browsers */
@supports (background-color: color-mix(in oklab, red, blue)) {
  .bg-bg-soft\/78 {
    background-color: color-mix(in oklab, var(--color-bg-soft) 22%, transparent);
  }
}
```

A `grep` on the minified output shows only the first rule. This is NOT a regression; color-mix wins in all Evergreen browsers and reproduces original `rgba()` alpha fidelity.

**Code-review catch:** `stat-card-template.tsx` had responsive text-size bump `text-[2.15rem] md:text-[2.35rem]`. Both snapped to `text-display-sm`, but the `md:` override became a dead no-op. Removed it.

**ESLint enforcement hardened:** Initial rule regex for `tracking-`/`leading-` had false-positive footguns with `var()/calc()`. Code review caught this; tightened regexes to exclude them.

## What We Tried

- **Dark-mode auditing**: Deferred (scope was light-mode tokens only). Flagged for follow-up.
- **Dual-rule CSS debug dance**: Tried single grep, failed. Switched to full build artifact inspection and CSS diff to verify color-mix output.

## Root Cause Analysis

The color-mix panic was a false-positive search strategy. Minified CSS doesn't preserve readable structure; a single `grep | head -1` gave a partial picture. Lesson: when inspecting compiled Tailwind v4 CSS for regressions, either:

1. Check the source `.css` file before minification, or
2. Use full-artifact inspection (all matches), not first-match shortcuts, or
3. Verify against a browser's computed styles on a live page.

The ESLint regex footgun was a classic: pattern worked for the "happy path" (`tracking-tighter`) but broke silently when variables entered (`tracking-[var(...)]`). Code review caught it because the reviewer tested the rule negatively.

## Lessons Learned

1. **Tailwind v4 `@supports` dual-rules are production-correct.** Progressive enhancement output means multiple CSS rules per token variant. Don't mistake @supports fallback absence for regression.

2. **Minified CSS is unreliable for spot-checking.** If you need to verify compiled output, inspect the source file or use full-artifact diffs. Single grep on minified is fast but dangerous.

3. **Large refactors need phase gates.** The 7-phase approach (tokens → renames → typography → color → radius → ESLint → validation) let us catch the `stat-card-template` responsive no-op and the ESLint regex false-positive before shipping.

4. **One-off layout constraints belong outside the token system.** `min-h-[100svh]`, `top/left` insets, and `w-[min()]` are genuinely arbitrary per component; they shouldn't trigger lint errors. Scoping the ESLint rule to design-token axes keeps the signal clean.

5. **Negative testing for regex rules prevents shipping footguns.** The code reviewer tested `tracking-[var(...)]` against the rule. This simple check caught a real blind spot.

## Next Steps

1. **Dark-mode token audit** — separated task; design tokens are light-only for now
2. **Verification baseline** — all green:
   - `pnpm lint` (0 errors)
   - `pnpm typecheck`
   - `pnpm build` (47 files touched, 280 arbitraries consolidated)
   - `pnpm validate` (includes diff-check, font-size-only parity verified)
   - `pnpm test` (34/34 unit tests passing)
   - ESLint rule negative-tested: 0 banned arbitraries remain, 37 layout one-offs preserved
   - Visual parity verified analytically (color-mix preserves alpha, ≤2.4px radius shift absorbed)

---

**Status:** RESOLVED (280 arbitraries → `@theme` tokens, ESLint guard in place, no behavior change. Production-ready; commit `74dee33`. One follow-up (dark-mode audit) separated per scope decision.)
