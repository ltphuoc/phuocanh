# Design System

This is the visual and component guidance for the current light-only editorial app shell.

## Visual Direction

- Tone: editorial romance, soft, emotional, playful but elegant.
- Theme policy: light mode only.
- Product intent: one cohesive visual language across mobile, tablet, and desktop with a
  keepsake-like center.

## Core Palette

| Token            | Value     |
| ---------------- | --------- |
| `--bg-canvas`    | `#FFF5E4` |
| `--bg-soft`      | `#FFF9F2` |
| `--surface`      | `#FFE3E1` |
| `--surface-tint` | `#FFD1D1` |
| `--brand-rose`   | `#FF9494` |

Use semantic tokens from `src/app/globals.css` in components. Avoid route-local hardcoded palette
values.

## Semantic Tokens

- Layout surfaces: `--background`, `--background-elevated`, `--card`, `--panel`,
  `--panel-strong`
- Interactive colors: `--primary`, `--primary-hover`, `--secondary`, `--accent`
- Text: `--foreground`, `--foreground-muted`, `--muted-foreground`
- Structure and focus: `--border`, `--ring`, `--glow-rose`, `--glow-blush`
- Gradients: `--gradient-hero`, `--gradient-memory`, `--gradient-active`,
  `--gradient-map-overlay`

Status tones should stay conservative and palette-adjacent.

## Typography

- Display font: `Fraunces`
- Body/control font: `Manrope`
- Use `Fraunces` for page titles, section titles, memory objects, milestone numbers, and short
  quotes.
- Use `Manrope` for repeated UI, controls, forms, navigation, and utility copy.
- Prefer shared CSS text utilities from `globals.css` over route-local ad hoc scales.

Shared text utilities include `ui-display`, `ui-page-title`, `ui-heading-xl`, `ui-heading-lg`,
`ui-page-description`, `ui-meta`, and `ui-quote`.

### Font-Size Scale

For one-off sizes that the `ui-*` utilities do not cover, use the `@theme` font-size scale instead
of arbitrary `text-[Nrem]` values. These tokens set font-size only (no line-height), so line-height
keeps coming from context or the `ui-*` classes.

| Token             | Size             |
| ----------------- | ---------------- |
| `text-2xs`        | `0.6875rem` 11px |
| `text-title-sm`   | `1.375rem` 22px  |
| `text-title`      | `1.5rem` 24px    |
| `text-title-lg`   | `1.6875rem` 27px |
| `text-heading`    | `1.875rem` 30px  |
| `text-heading-lg` | `2rem` 32px      |
| `text-display-sm` | `2.25rem` 36px   |

Letter-spacing uses `tracking-meta` (`0.06em`, the eyebrow/meta tracking) — avoid arbitrary
`tracking-[…]`.

## Spacing And Layout

- Vertical rhythm: `SectionStack`
- Repeated collection grids: `ResponsiveGrid`
- Form grouping: `FormSection`
- Public/global pages: `PageContainer`
- Auth pages: `AuthShell`
- Authenticated pages: shared `(app)` shell layout

Container intent:

| Surface              | Approximate max width |
| -------------------- | --------------------- |
| Immersive app shell  | `1320px`              |
| Standard content     | `1180px`              |
| Reading/detail pages | `760px`               |

## Radius And Elevation

- Control radius: `--radius-control` (`rounded-control`)
- Card radius: `--radius-card` (`rounded-card`)
- Panel radius: `--radius-panel` (`rounded-panel`)
- Memory object radius: `--radius-memory` (`rounded-memory`)
- Hero/editorial radius: `--radius-hero` (`rounded-hero`)
- Pill/tag radius: `--radius-pill` (`rounded-pill`)
- Standard elevation: `--shadow-whisper`
- Editorial/floating elevation: `--shadow-cloud`
- Focus/emphasis glow: `--shadow-glow`
- Ring glows: `shadow-focus-blush`, `shadow-focus-rose`, `shadow-focus-rose-soft`

Use the named radius utilities (`rounded-card`, `rounded-panel`, …) rather than
`rounded-[var(--radius-*)]` or raw `rounded-[Nrem]` values.

## Surface Hierarchy

The app uses a three-tier surface hierarchy to create visual depth:

| Tier                   | Elements                                                                                             | Treatment                                                                                                   | Purpose                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Page background**    | `body`                                                                                               | Layered gradient + grain texture (unchanged)                                                                | Establishes the warm editorial foundation                                                                 |
| **Content surface**    | `SectionCard` (default), `PageHeader`, `EmptyState`, `InsetPanel`, cards                             | Solid `--card` / `--panel` token backgrounds; border + `--shadow-whisper` tinted shadow; no `backdrop-blur` | Inline content sits directly on the page; solid surface ensures legibility and reduces GPU load on mobile |
| **Floating / overlay** | `SideNavigation` rail + drawer, `BottomNavigation` dock, `MoreNavigationSheet`, sticky mobile header | Translucent white + `backdrop-blur-xl` (content scrolls behind)                                             | Floating elements blur scrolling content to signal elevation and distinguish from fixed page layout       |

Keep the `SectionCard` `hero` gradient variant and `::before` overlay — they create depth through
layering without blur. Numeric displays within surfaces apply `font-variant-numeric: tabular-nums`
for stable figure alignment.

## Component Principles

- Compose from shared primitives before adding route-local markup.
- Use Lucide icons for core navigation and decorative state markers.
- Keep touch targets comfortable on mobile and tablet.
- Keep focus-visible rings on interactive controls.
- Use `motion` for restrained dock, rail, drawer, reveal, and state transitions.
- Avoid generic dashboard-card mosaics when a page has a stronger narrative composition.

## Responsive Behavior

- Mobile (`<md`): floating dock, centered memory action, `More` sheet.
- Tablet/desktop (`md+`): slim rail, expandable drawer, right content canvas.
- Forms stack on mobile and may use two columns from `md` for parallel fields.
- List rows keep stable action slots and minimum height.
- Template widgets should share the same spacing and tone.

## Guardrails

- Do not reintroduce dark-mode branches.
- Do not add non-semantic hardcoded color utilities in pages.
- Do not duplicate component styling per route when a shared primitive exists.
- Do not describe or implement the current shell as a simple sidebar plus bottom-nav pattern; it is
  dock plus rail/drawer.
- Do not use arbitrary Tailwind values for typography, color, radius, or shadow
  (`text-[Nrem]`, `tracking-[…]`, `bg-[rgba(…)]`, `rounded-[Nrem]`, `shadow-[…]`). Use the `@theme`
  tokens above. The `design-tokens/no-arbitrary` ESLint rule
  (`eslint-rules/no-arbitrary-design-tokens.mjs`) fails the build on violations. Translucent brand
  surfaces use the `/alpha` modifier (e.g. `bg-bg-soft/78`, `text-muted-foreground/60`). Layout
  one-offs (`min-h-[100svh]`, `aspect-[4/3]`, `grid-cols-[…]`, `*-[var(…)]`, `rounded-[calc(…)]`)
  remain allowed.
