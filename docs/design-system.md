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

- Control radius: `--radius-control`
- Panel radius: `--radius-panel`
- Memory object radius: `--radius-memory`
- Hero/editorial radius: `--radius-hero`
- Pill/tag radius: `--radius-pill`
- Standard elevation: `--shadow-whisper`
- Editorial/floating elevation: `--shadow-cloud`
- Focus/emphasis glow: `--shadow-glow`

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
