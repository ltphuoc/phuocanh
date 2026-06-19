# Code Standards

Conventions for working in this codebase. These describe how the current code is written; they do
not override `AGENTS.md` safety boundaries or the source-of-truth order in
`docs/agent/agent-handbook.md`.

## Files And Naming

- Use kebab-case for source file names with descriptive, self-documenting names.
- Interactive `(app)` routes split into a Server Component `page.tsx` and a `*-client-page.tsx`
  client component.
- Keep files focused; split large modules along clear functional boundaries rather than growing one
  file indefinitely.
- Do not reference plan artifacts (phase numbers, finding codes, audit labels) in code comments,
  test names, or migration filenames. Explain the invariant or trade-off, not its origin.

## Components

- Server Components are the default. Add `"use client"` only for interactivity, query hydration,
  forms, motion, navigation state, or file inputs.
- Compose from shared primitives in `src/components/layout` and `src/components/ui` before adding
  route-local layout markup.
- UI and form components use named exports; route `layout.tsx` / `page.tsx` use default exports per
  Next.js conventions.
- `src/components/app/navigation-model.ts` is the single source of truth for navigation entries.

## Forms And Mutations

- Forms use React Hook Form with Zod resolvers, submit to Server Actions, and surface results with
  Sonner toasts.
- Server Actions keep the shared `ActionState` / `ActionStateWithData<T>` response shape.
- Wrap Server Actions in TanStack `useMutation` via `src/lib/query/action-mutation.ts`.
- Same-session freshness is owned by targeted `invalidateQueries(...)`, precise `setQueryData(...)`,
  or optimistic updates — not broad invalidation or hard reloads.
- Mutations that own membership, invite, encryption, album, media, or gameplay invariants go through
  SQL RPCs, never direct table writes. Memory media edits run through the atomic `update_memory_media`
  RPC so row and media changes commit together.

### Canonical Form-Error Pattern

Every validated form field follows this structure:

```tsx
<FormSection
  label="Field Label"
  htmlFor="fieldId"
  required={true}
  errorId="fieldId_error"
  errorMessage={errors.fieldName?.message}
>
  <Input
    id="fieldId"
    aria-invalid={!!errors.fieldName}
    aria-describedby={errors.fieldName ? 'fieldId_error' : undefined}
    aria-required={true}
    {...register('fieldName')}
  />
</FormSection>
```

- `FormSection` always renders a real `<label>` associated to the control; use `htmlFor` to point
  at the input's `id`.
- Append a visual asterisk with `required={true}` on `FormSection` (only when `htmlFor` points at
  a real control).
- Wire `aria-invalid={!!error}` and `aria-describedby={errorId}` on the input when errored.
- Wire `aria-required` on the input to match the `required` prop on `FormSection`.
- Inline errors render next to the field via `FormSection`'s `errorMessage` prop with
  `role="alert"` so they announce on submit — not in toasts or below the form.
- For Zod schemas that need i18n messages, export `build*Schema(t)` builder functions that accept
  the i18n translator and return a schema with localized messages.
- Server Actions remain the source of truth for validation; client validation is UX only and must
  never weaken server-side checks.

## Data Reads And Query Keys

- Authenticated pages prefetch through helpers in `src/lib/server/*` and hydrate with
  `dehydrateAppQuery(...)`.
- Query keys live in `src/lib/query/app-query-keys.ts` under one `["app-data", ...]` root. Use exact
  keys; do not invent ad hoc keys at call sites.
- Client query functions use `/api/app-data/*` only for refetches after invalidation.
- Signed `memory-media` URLs are created server-side before render.

## Styling

- Light mode only. Do not reintroduce dark-mode branches.
- Use semantic tokens from `src/app/globals.css`; no route-local hardcoded palette values.
- Compose class names with `cn(...)` from `src/lib/utils/cn.ts`.
- Use shared text utilities (`ui-display`, `ui-page-title`, etc.) over ad hoc type scales.
- No arbitrary Tailwind values for typography, color, radius, or shadow (`text-[Nrem]`,
  `tracking-[…]`, `bg-[rgba(…)]`, `rounded-[Nrem]`, `shadow-[…]`); use the `@theme` tokens. The
  `design-tokens/no-arbitrary` ESLint rule (`eslint-rules/no-arbitrary-design-tokens.mjs`) fails the
  build on violations. Layout one-offs (`min-h-[100svh]`, `aspect-[4/3]`, `grid-cols-[…]`) remain
  allowed.
- See `docs/design-system.md` for tokens, typography, spacing, and responsive rules.

## Internationalization

- All user-facing routes are locale-prefixed; `vi` is default, `en` is supported.
- Add copy to both `messages/vi.json` and `messages/en.json`; keep keys in parity.
- Run `pnpm i18n:check` and `pnpm i18n:audit-hardcoded` when touching user-visible copy.

## TypeScript And Schema

- `src/lib/supabase/database.types.ts` and `src/lib/db/schema.ts` are mirrors of SQL, not edit
  surfaces. Schema changes require a real migration in `supabase/migrations/`.
- Couple-level day-boundary logic is rooted in `couples.timezone`; pass the saved timezone
  explicitly to date helpers.

## Verification Baseline

Before PRs, run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`. Add
`pnpm typecheck:functions` for Edge Function or reminder-contract changes, and i18n checks for
copy changes. See `docs/development-verification.md` for the full matrix. Never claim a fresh
`pnpm test:e2e` result unless the suite ran in the current change.
</content>
