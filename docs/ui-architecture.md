# UI Architecture

## App Shell Structure
- `src/app/(app)/layout.tsx` is the single authenticated shell.
- Mobile:
- floating keepsake dock above the safe area
- centered memory action orb
- `More` opens a dedicated blurred sheet for secondary destinations
- Tablet/Desktop:
- slim floating rail for primary destinations
- expandable secondary drawer for grouped destinations
- right content canvas for all route pages
- `src/app/(public)` uses `AuthShell` for consistent login/onboarding/invite composition.
- Global visual mode is light-only with editorial semantic tokens from `globals.css`.

## Shared Layout Primitives
- `PageContainer`: global max-width and horizontal gutters.
- `PageHeader`: editorial title/description/action block with optional quote and milestone surface styles.
- `SectionStack`: vertical rhythm controller.
- `ResponsiveGrid`: shared responsive grid pattern with density options.
- `FormSection`: canonical field grouping primitive.
- `ShellPage`: default scaffold for future feature shell routes.

Rules:
- Route pages should compose primitives, not custom wrapper stacks.
- New pages must not define their own spacing system if a primitive exists.

## Navigation Model Boundaries
- `navigation-model.ts` is the source of truth.
- Primary routes:
- `appPrimaryNavigationItems`
- Secondary grouped routes:
- `appSecondaryNavigationItems`
- Mobile nav consumes `appMobileNavigationItems` plus a dedicated `appMemoryActionItem`.
- Desktop rail consumes primary routes directly and expands into a secondary drawer.
- Navigation item shape includes typed Lucide icon and route match prefixes.
- Current primary navigation is `Home`, `On this day`, and `Chat`.

## Shared Component Boundaries
- Foundation controls: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `SectionCard`.
- State/display: `EmptyState`, `LoadingState`, `ListRow`, `MemoryCard`, `ComingSoonCard`, `PageReveal`.
- Story/editorial: `AnniversarySpotlight`, `TimelineRibbon`, `TravelAtlasShell`, `ChatThreadPreview`.
- Future templates: `TripCardTemplate`, `GameCardTemplate`, `CountdownWidgetTemplate`, `StatCardTemplate`.

Rules:
- Avoid route-local reimplementation of list rows, placeholders, or cards.
- Use semantic tokens from `globals.css`; avoid hardcoded palette values.
- Decorative state markers should use icon components (Lucide), not emoji strings.

## Page Composition Patterns
- Implemented data pages:
- editorial spotlight or `PageHeader` + shared surfaces + existing forms/actions
- Feature shell pages:
- `ShellPage` + purpose-built editorial shell surfaces or templates + `ComingSoonCard`
- Detail pages:
- header action for back navigation + content section(s) below

## Drift Prevention Rules
- Do not reintroduce dark mode branches in CSS or components.
- Do not use emoji icons for core navigation.
- Do not add new page-level container widths/gutters when primitives can serve.
- Do not fall back to generic dashboard card mosaics when the screen has a stronger narrative composition.
- Every new route should map to one of:
- implemented data page pattern
- shell placeholder pattern
