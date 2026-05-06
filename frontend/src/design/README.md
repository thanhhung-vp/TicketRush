# TicketRush Design System

Three-tier token system: **primitives → semantic → legacy aliases**.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | All CSS variables. `:root` has light values; `.dark` overrides for dark mode. |
| `tokens.js`  | Tailwind theme extension. Generates `bg-*`, `text-*`, `border-*`, `rounded-*`, `shadow-*`, `text-<scale>`, `font-*`, `duration-*`, `ease-*` utility classes. |
| `README.md`  | This file. |

## Usage rules (DO)

- Use semantic Tailwind classes only: `bg-surface`, `text-label-primary`, `border-separator`, `bg-accent`, `text-danger`, `rounded-xl`, `shadow-1`.
- For status backgrounds with tint: use the explicit tint tokens — `bg-success-tint`, `bg-warning-tint`, `bg-danger-tint`, `bg-info-tint`, `bg-accent-tint`. Tailwind opacity modifiers (`bg-success/15`) DO NOT work on these tokens because the underlying values are CSS variables; if you need a different opacity, add a new tint token to `tokens.css`.
- For motion: `transition-colors duration-base ease-standard`.
- Type scale: `text-largeTitle`, `text-title-1`, `text-headline`, `text-body`, `text-subhead`, `text-footnote`, `text-caption-1`.

## Usage rules (DON'T)

- Don't reference `--primitive-*` from components. They are scale-only.
- Don't write hex literals (`bg-[#1c1c1e]`, `style={{ color: '#fff' }}`). If you need a value, add it to `tokens.css` as a semantic token first.
- Don't use raw Tailwind grays (`bg-gray-900`, `text-gray-400`, `border-gray-800`). They don't switch on theme. Use semantic tokens.
- Don't use legacy aliases (`bg-primary`, `bg-navy`, `dark:bg-dark-card`, `var(--color-bg)`) in NEW code. They exist only so existing code keeps building during migration; they will be removed in Phase 2.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg-canvas` | gray-50 | black | `<body>` |
| `bg-surface` | white | gray-950 | Card, modal, dropdown |
| `bg-surface-elevated` | white + shadow | gray-900 | Sticky bars, popover |
| `bg-surface-elevated-translucent` | white 85% | gray-950 80% | Backdrop-blur Navbar |
| `bg-fill-tertiary` | gray 12% | gray 24% | Input bg, chip, ghost hover |
| `bg-fill-quaternary` | gray 8% | gray 18% | Subtle hover |
| `text-label-primary` | #1d1d1f | gray-50 | Body |
| `text-label-secondary` | gray 60% | gray 60% | Subtitle |
| `text-label-tertiary` | gray 30% | gray 30% | Placeholder, disabled |
| `border-separator` | gray 18% | gray 34% | 1px hairline |
| `bg-accent` / `text-accent` | pink #E6007E | pink #FF2D7E | Primary CTA, link |
| `bg-success` / `text-success` | green #34C759 | green #30D158 | Paid |
| `bg-warning` / `text-warning` | orange #FF9500 | orange #FF9F0A | Pending |
| `bg-danger` / `text-danger` | red #FF3B30 | red #FF453A | Error |
| `bg-info` / `text-info` | blue #007AFF | blue #0A84FF | Info |

## Type scale (Apple HIG)

| Class | Size / Line-height | Use |
|---|---|---|
| `text-largeTitle` | 34/41 | Hero |
| `text-title-1` | 28/34 | Page title |
| `text-title-2` | 22/28 | Section heading |
| `text-title-3` | 20/25 | Card title |
| `text-headline` | 17/22 (semibold) | List primary |
| `text-body` | 17/22 | Default |
| `text-callout` | 16/21 | Helper |
| `text-subhead` | 15/20 | Form label |
| `text-footnote` | 13/18 | Metadata |
| `text-caption-1` | 12/16 | Badge |
| `text-caption-2` | 11/13 | Tiny |

## Radius

`rounded-sm` (6) · `rounded-md` (10) · `rounded-lg` (14) · `rounded-xl` (18) · `rounded-2xl` (22) · `rounded-full`.

## Shadow

`shadow-1` · `shadow-2` · `shadow-popover` · `shadow-focus` · `shadow-focus-danger`.
Each shadow has separate light/dark values resolved via CSS var.

## Motion

Duration: `duration-fast` (120ms) · `duration-base` (200ms) · `duration-slow` (320ms) · `duration-slower` (500ms).
Easing: `ease-standard` · `ease-emphasized` (Apple spring-like) · `ease-decelerate`.

## Adding a new token

1. Decide whether it's primitive (raw scale) or semantic (named for use case).
2. Add to `tokens.css` under the appropriate section. If semantic, also add the dark override under `.dark`.
3. If components need to reach it via Tailwind, add the key to `tokens.js` under the right group (`colors`, `borderRadius`, etc.).
4. Update this README's table.
