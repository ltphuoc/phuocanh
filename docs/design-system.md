# Design System

## Visual Direction
- Tone: editorial romance, soft, emotional, playful but elegant, and highly memorable.
- Theme policy: light mode only.
- Product intent: one cohesive visual language across mobile, tablet, and desktop with a keepsake-like emotional center.

## Core Palette
- `--bg-canvas`: `#FFF5E4`
- `--bg-soft`: `#FFF9F2`
- `--surface`: `#FFE3E1`
- `--surface-tint`: `#FFD1D1`
- `--brand-rose`: `#FF9494`

## Semantic Color Mapping
- Layout surfaces:
- `--background`, `--background-elevated`, `--card`, `--panel`, `--panel-strong`
- Interactive colors:
- `--primary`, `--primary-hover`, `--secondary`, `--accent`
- Text:
- `--foreground` uses deep plum-ink contrast
- `--foreground-muted` / `--muted-foreground` use softened plum neutrals
- Structure and depth:
- `--border`, `--ring`, `--glow-rose`, `--glow-blush`
- Gradients:
- `--gradient-hero`
- `--gradient-memory`
- `--gradient-active`
- `--gradient-map-overlay`
- Status tones remain conservative and palette-adjacent. No unrelated neon or saturated dashboard hues are introduced.

## Light-Mode Rules
- Global `color-scheme` is fixed to `light`.
- No dark tokens or dark media-query branches are allowed in app styles.
- Components must consume semantic tokens only, not route-level hardcoded colors.

## Typography
- Display font: `Fraunces`
- Body font: `Manrope`
- `Fraunces` is reserved for page titles, section titles, memory objects, milestone numbers, and short quotes.
- `Manrope` is used for repeated UI, controls, forms, navigation, and utility copy.
- Shared text primitives:
- `ui-display`
- `ui-page-title`
- `ui-heading-xl`
- `ui-heading-lg`
- `ui-page-description`
- `ui-meta`
- `ui-quote`
- Typography should come from the shared CSS utilities in `globals.css`, not route-local ad hoc scales.

## Spacing
- Vertical rhythm: `SectionStack`.
- Grid rhythm: `ResponsiveGrid`.
- Form rhythm: `FormSection`.
- Page-level gutters and max widths must come from shared layout primitives only.
- Current container intent:
- immersive shell around `1320px`
- standard content around `1180px`
- reading/detail pages around `760px`

## Radius and Elevation
- Control radius: `--radius-control`
- Panel radius: `--radius-panel`
- Memory object radius: `--radius-memory`
- Hero/editorial radius: `--radius-hero`
- Pill/tag radius: `--radius-pill`
- Elevation:
- `--shadow-whisper` for standard elevated surfaces
- `--shadow-cloud` for editorial emphasis and floating navigation
- `--shadow-glow` for focused interactive emphasis only

## Component Principles
- Compose from shared primitives:
- Layout: `PageContainer`, `PageHeader`, `SectionStack`, `ResponsiveGrid`, `FormSection`, `AuthShell`, `ShellPage`.
- UI controls: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `SectionCard`.
- Shared state UI: `EmptyState`, `LoadingState`, `ListRow`, `MemoryCard`, `ComingSoonCard`, `PageReveal`.
- Story surfaces: `AnniversarySpotlight`, `TimelineRibbon`, `FeaturedMemoryObject`, `TravelAtlasShell`.
- Template widgets remain available for shell-only Phase 2+/3 routes.

## Interaction Patterns
- Motion is present but restrained:
- shared layout emphasis for active navigation states
- gentle lift/tilt on collectible surfaces
- short color/focus transitions for controls
- spring-based drawers/sheets
- Focus-visible states must use the semantic ring token.
- Touch targets stay comfortable on mobile and tablet.
- `motion` is the current animation layer for dock, rail, reveal, and shell transitions.

## Guardrails
- Do not reintroduce dark-mode support.
- Do not add non-semantic hardcoded color utilities in pages.
- Do not duplicate component styling per route when a shared primitive exists.
- Avoid generic dashboard-card layouts as the default composition.
