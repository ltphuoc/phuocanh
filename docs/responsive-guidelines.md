# Responsive Guidelines

## Breakpoints

- `sm`: 640px
- `md`: 768px (tablet baseline)
- `lg`: 1024px
- `xl`: 1280px (desktop baseline)
- `2xl`: 1536px

## Navigation Behavior

- Mobile (`<md`):
- floating dock above the safe area
- primary destinations come from `appMobileNavigationItems`
- a centered memory action orb sits outside the dock
- `More` opens a dedicated sheet with grouped secondary destinations
- Tablet/Desktop (`md+`):
- persistent floating rail for primary routes
- expandable drawer for grouped secondary routes
- right content panel uses one consistent canvas layout

## Container Rules

- Use `PageContainer` for public pages and global states (`loading`, `error`, `not-found`).
- Auth pages use `AuthShell`:
- mobile: stacked single-column
- tablet/desktop: two-column split (`visual support + form panel`)
- Authenticated app pages are wrapped by `(app)/layout`:
- responsive outer max width around `1320px` + editorial canvas spacing
- rail/drawer + content canvas composition on `md+`

## Grid Rules

- Use `ResponsiveGrid` as the default card collection grid.
- `columns=1`: linear narrative/detail pages.
- `columns=2`: primary dashboard/list pages.
- `columns=3`: only when density clearly helps scanability.
- Use `density="compact"` for dense widgets and templates.
- Keep multi-section pages inside `SectionStack` and nest `ResponsiveGrid` per section.

## Page Layout Patterns

- Header-first pattern: `PageHeader` followed by section cards.
- Story-first pattern: anniversary/editorial hero followed by memory ribbon and secondary utilities.
- Shell pattern: `ShellPage` for feature routes that are UI-ready but backend-pending (header + designed shell surface/widgets).
- Detail pattern: action in header, content in one or more `SectionCard` blocks.
- Form pattern: group fields with `FormSection`, avoid scattered label/input markup.

## Component Responsiveness

- Buttons and form controls default to touch-safe height (`h-12` or shared control token equivalent).
- Forms:
- stack on mobile
- optional 2-column grouping from `md` where fields are parallel (e.g. date + location)
- List rows (`ListRow`) keep min-height and stable action slots.
- Memory objects keep consistent metadata order and collectible surface hierarchy.
- Template widgets (`Trip/Game/Countdown/Stat`) must share the same spacing and tone.

## Accessibility & Interaction

- Keep focus-visible rings on interactive controls across breakpoints.
- Maintain readable line lengths with max-width containers/panels.
- Do not collapse desktop spacing to mobile-tight values; preserve breathing room on `lg+`.
- Keep animation restrained and short; motion should not block interactions.
- Preserve safe-area clearance for the floating mobile dock.

## Do / Don’t

- Do use shared layout primitives on every route.
- Do keep one spacing rhythm per page.
- Do keep mobile actions reachable and desktop space balanced.
- Don’t mix custom container/gutter rules per page.
- Don’t keep tablet in stretched-mobile mode when two-column composition improves scanability.
- Don’t describe the current shell as a simple sidebar + bottom-nav app; the current interaction model is dock + rail/drawer.
