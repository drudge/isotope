# Design System - Isotope for Technitium DNS

## Spacing

Base: 4px (Tailwind unit)
Scale: 2 (8px), 3 (12px), 4 (16px), 6 (24px)

| Context | Value | Class |
|---------|-------|-------|
| Tight groups | 8px | gap-2 |
| Default | 12px | gap-3 |
| Comfortable | 16px | gap-4 |
| Sections | 24px | gap-6 |
| Page sections | space-y-6 | |
| Form fields | space-y-4 | |
| Label to input | space-y-2 | |

## Typography

| Level | Class | Usage |
|-------|-------|-------|
| Page title | text-3xl font-bold tracking-tight | h1 |
| Section title | text-2xl font-bold | h2, card header |
| Subsection | text-lg font-semibold | h3 |
| Card title | text-base font-semibold | CardTitle |
| Body | text-sm | Default text |
| Caption | text-xs text-muted-foreground | Labels, help text |
| Mono | font-mono text-sm | Technical data |

## Depth

Strategy: **Borders only** (34 borders vs 3 shadows across codebase)

- Cards: default 1px border via shadcn Card
- Dividers: border-b, divide-y
- Accent: border-l-2 for nested sections
- Shadow: only on stat box hover (hover:shadow-md)

## Radius

| Context | Class |
|---------|-------|
| Default (cards, containers) | rounded-lg |
| Form elements | rounded-md |
| Circles (avatars, dots) | rounded-full |

## Colors

### Status
| State | Light | Dark |
|-------|-------|------|
| Blue | bg-blue-100 text-blue-800 | bg-blue-900 text-blue-200 |
| Green | bg-green-100 text-green-800 | bg-green-900 text-green-200 |
| Red | bg-red-100 text-red-800 | bg-red-900 text-red-200 |
| Purple | bg-purple-100 text-purple-800 | bg-purple-900 text-purple-200 |
| Amber | bg-amber-100 text-amber-800 | bg-amber-900 text-amber-200 |
| Indigo | bg-indigo-100 text-indigo-800 | bg-indigo-900 text-indigo-200 |

### Surfaces
- Hover: bg-muted/50
- Faint section: bg-muted/30
- Background: bg-background
- Danger text: text-red-600 dark:text-red-400
- Success text: text-green-600 dark:text-green-400

## Buttons

| Variant | Usage |
|---------|-------|
| default | Primary actions |
| outline | Secondary actions |
| ghost | Tertiary, icon-only |
| destructive | Danger actions |

Size: size="sm" in dense layouts, default elsewhere, size="icon" for icon-only (h-8 w-8)
Icon size inside buttons: h-4 w-4

## Responsive

Primary breakpoint: sm (640px)
Layout shifts: md (768px)
Wide layouts: lg (1024px), xl (1280px) rare

Patterns:
- `hidden sm:inline` - show text on desktop
- `flex-col sm:flex-row` - stack→row
- `gap-2 sm:gap-4` - tighten on mobile
- `px-3 sm:px-4` - reduce padding on mobile
- `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` - responsive grid

## Cards

Always use shadcn Card with CardHeader + CardContent (+ optional CardFooter)
No custom shadows. Hover: hover:bg-muted/50 transition-colors on interactive cards.

## Dialogs

| Size | Class |
|------|-------|
| Small | max-w-md |
| Medium | max-w-lg |
| Large | max-w-2xl |
| XL | max-w-[95vw] sm:max-w-2xl lg:max-w-3xl or lg:max-w-4xl |

Height: max-h-[90vh] with sticky header/footer
Layout: p-0 on DialogContent, internal px-6 for sections

## Transitions

- Color changes: transition-colors
- Opacity: transition-opacity
- Refresh buttons: animate-spin on RefreshCw icon (only while action is in progress)

## Loading Indicators

### IsotopeSpinner (`src/components/ui/isotope-spinner.tsx`)

Branded loading spinner based on the Isotope atom logo. The electron orbits the nucleus while the nucleus pulses and the orbit ring breathes in opacity.

| Size | Class | Dimensions | Usage |
|------|-------|------------|-------|
| `sm` | size-4 | 16px | Inline in buttons during form submission |
| `md` | size-6 | 24px | Section/component loading states |
| `lg` | size-12 | 48px | Full-page loading (e.g., auth check) |

Usage:
- Button: `<IsotopeSpinner size="sm" className="mr-2" />` + loading text
- Section: `<IsotopeSpinner size="md" className="text-muted-foreground" />` centered in container
- Full-page: `<IsotopeSpinner size="lg" className="text-muted-foreground" />` in `min-h-screen flex items-center justify-center`

Props: `size` (`"sm" | "md" | "lg"`, default `"md"`), `className` (inherits text color via `currentColor`)

### When to Use

| Indicator | When |
|-----------|------|
| **IsotopeSpinner** | Action is processing (button submit, data fetching, auth check) |
| **Skeleton** | Content shape is known (stat cards, lists, text blocks) — `animate-pulse` placeholder |
| **RefreshCw animate-spin** | Only on refresh/resync buttons where the circular arrow icon is semantically meaningful |

## Page Layout

Standard page structure uses a two-column grid at `lg` breakpoint.

| Element | Class |
|---------|-------|
| Page container | `space-y-6` |
| Page title | `text-3xl font-bold tracking-tight` (h1) |
| Page subtitle | `text-muted-foreground mt-1` (p) |
| Two-column grid | `grid grid-cols-1 lg:grid-cols-3 gap-6` |
| Main column | `lg:col-span-2 space-y-6` |
| Sidebar column | `space-y-6` (takes remaining 1/3) |

Main column holds hero cards, stat grids, tab content, and results.
Sidebar holds guidance cards and tip boxes.

## Hero Status Card

Primary card at the top of each page. Uses `border-2` for emphasis.

Structure:
- `Card className="border-2"`
- `CardHeader className="pb-3"` with flex row: title (left) + actions (right)
- Title: `CardTitle className="text-2xl flex items-center gap-2"` with icon (`h-6 w-6`) + text
- Subtitle: `CardDescription`
- Action buttons: `Button variant="outline" size="icon"` (refresh, settings, etc.)
- `CardContent className="space-y-6"` for stats, info, and actions

## Stat Boxes

Gradient-colored metric containers. Two sizes.

### Large (Cache page)
- Container: `p-6 rounded-lg border-2 bg-gradient-to-br from-{color}-50 to-{color}-100 dark:from-{color}-950/50 dark:to-{color}-900/30 border-{color}-200 dark:border-{color}-800`
- Icon row: `flex items-center gap-3 mb-2` with icon in `p-2 rounded-lg bg-{color}-500/20`
- Icon: `h-5 w-5 text-{color}-600 dark:text-{color}-400`
- Label: `text-sm font-medium text-{color}-900 dark:text-{color}-100`
- Value: `text-4xl font-bold text-{color}-900 dark:text-{color}-50`
- Description: `text-sm text-{color}-700 dark:text-{color}-300 mt-1`

### Compact (Blocking page)
- Container: `p-4 rounded-lg border` (border-1)
- Same gradient and icon patterns, smaller: icon `h-4 w-4`, label `text-xs`, value `text-2xl`

### Interactive
Wrap in `<button>` with: `text-left transition-all hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-{color}-500/50`

## Guidance Sidebar

Cards in the 1/3 sidebar with educational bullet-point content.

### Guidance Card
- `Card` (default border, no border-2)
- `CardHeader` with `CardTitle className="text-lg"`
- `CardContent className="space-y-3"`
- Bullet items: `flex gap-3` with dot `h-2 w-2 rounded-full bg-{color}` (in `flex-shrink-0 mt-0.5`)
- Content: `font-medium text-sm` title + `text-sm text-muted-foreground` description

### Tip/Notice Box
Standalone (not in a Card):
- Container: `p-4 rounded-lg bg-{color}-50 dark:bg-{color}-950/20 border border-{color}-200 dark:border-{color}-800`
- Text: `text-sm text-{color}-900 dark:text-{color}-100`
- Bold prefix: `<strong>Tip:</strong>` or `<strong>Note:</strong>`
- Common colors: blue (tips), amber (warnings)

## Quick Actions Bar

Horizontal action strip inside a hero card, below stats.

- Container: `flex flex-wrap items-center gap-3 pt-4 border-t`
- Buttons: `Button variant="outline" size="sm"` with icon + text
- Trailing info: `text-xs text-muted-foreground ml-auto`

## Hover List Items

Interactive list rows in Card with `p-0` content and `divide-y`.

- Row: `flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group`
- Reveal-on-hover: `opacity-0 group-hover:opacity-100 transition-opacity`
- Action buttons: `Button variant="ghost" size="icon" className="h-8 w-8"` with reveal-on-hover

## Record Display

DNS record rows in a divided list.

- Container: `px-4 py-3.5 hover:bg-muted/50 transition-colors`
- Layout: `flex items-start gap-3`
- Type badge: `Badge variant="outline" className="mt-0.5 w-14 justify-center font-mono text-xs shrink-0 h-6"`
- Content: `flex-1 min-w-0 space-y-1.5`
  - Name: `font-mono text-sm font-medium break-all`
  - Data: `font-mono text-sm text-muted-foreground break-all`
- TTL: `flex flex-col items-end gap-0.5 shrink-0 min-w-[80px]`
  - Label: `text-[10px] uppercase tracking-wide text-muted-foreground/60`
  - Value: `text-sm font-medium tabular-nums`
