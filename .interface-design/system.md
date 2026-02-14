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
- Loading: animate-spin on RefreshCw icon
