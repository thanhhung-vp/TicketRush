# Phase 0 — TicketRush Apple-style Design System

**Date:** 2026-05-06
**Status:** Approved (brainstorming) → ready for implementation plan
**Owner:** jc-hello
**Scope:** Foundation sub-project of a 6-part UI initiative. Phases 1+ (Seat Designer, Event-show polish, Animations, News, Mock data) build on top of this.

---

## 1. Goal & success criteria

Replace the ad-hoc dark-only color system with a token-based Apple-style design system that supports light + dark modes correctly across primitive components and the Navbar/Footer.

### Success criteria

1. Toggling light/dark switches every primitive component, the Navbar, and the Footer correctly — no hard-coded dark surfaces remain in light mode.
2. Primitive components (`Button`, `Card`, `Input`, `Textarea`, `Select`, `Badge`, `Alert`, `Spinner`, `ThemeToggle`, `LanguageSwitcher`, `UserNavigation`) plus `Navbar` and `Footer` use only semantic token classes — no hex literals, no `bg-gray-*` direct refs.
3. Brand pink `#E6007E` is the single accent: primary CTA, inline links, active nav. Brand cyan `#00AEEF` is removed.
4. The 5 main pages (Home, EventDetail, Login, MyTickets, Admin) render in both themes without console errors and without broken layout. Pages not yet reskinned (SeatMap, SeatDesigner, AdminPage internals, EventDetail hero) are allowed to look "stylistically off" — their structural reskin is Phase 1+.
5. Production build passes; no Tailwind purge warnings about missing token classes.

### Non-goals

- Reskinning `SeatMap`, `SeatDesigner` (Phase 1).
- Reskinning `AdminPage` (1004 lines) and `AdminEventPage` internals (Phase 2).
- Reskinning the `EventDetailPage` hero / Apple.com cinematic treatment (Phase "event-show polish").
- Animation choreography beyond the standard transition tokens (Phase 3).
- Mock data and news content work (separate sub-projects).
- ESLint rule to forbid hardcoded color classes (nice-to-have, may be added if time permits but does not block Phase 0 completion).
- Visual regression tooling (Chromatic/Percy etc.).

---

## 2. Decisions

The following were locked in during brainstorming on 2026-05-06:

| Decision | Choice | Reason |
|---|---|---|
| Apple flavor | **Hybrid** — iOS Settings base for app/admin (dense, functional) + Apple.com cinematic patches for landing/event hero (typography, whitespace) | Ticketing UI needs density iOS Settings provides; marketing surfaces benefit from Apple.com hero treatment. macOS Sonoma translucent rejected as too heavy for data-dense lists. |
| Brand color | Drop cyan. Keep pink `#E6007E` as the **single accent**. Everything else monochrome (Apple grays). | Apple aesthetics are monochrome + 1 accent. Two brand colors fight each other. Pink is strong enough alone for TicketRush identity. |
| Component scope | Tokens + 9 primitives in `components/ui/` + `Navbar` + `Footer`. SeatMap/SeatDesigner and large pages excluded. | Minimum viable design system: enough for site-wide consistency without bloating Phase 0. Larger components inherit improvements via the alias map. |
| Migration strategy | **Token-aliased incremental.** New semantic tokens added; legacy class names (`primary`, `secondary`, `navy`, `dark.*`) aliased to map onto new tokens so existing code keeps building. Reskin is per-component, no big-bang grep-replace. | Safe ship cadence; small diffs; easy rollback per component. |
| Critical fix bundled | Yes — Phase 0 also fixes the existing light/dark sync bug (primitives are dark-only and ignore the `.dark` class). | The two are inseparable: tokens-only without component reskin would not solve the visible bug. |

---

## 3. Architecture

### 3.1 File layout

```
frontend/src/
├── design/                       (NEW)
│   ├── tokens.css                CSS variables — light + dark via .dark class
│   ├── tokens.js                 JS export consumed by tailwind.config.js
│   └── README.md                 Token reference + usage rules + DO-NOT list
├── index.css                     Reduced to: @tailwind directives + @import './design/tokens.css'
├── tailwind.config.js            Imports tokens.js and extends theme
└── components/ui/                Reskinned to use only semantic token classes
```

### 3.2 Token tiers

Three layers, strict directionality (component never references primitive directly).

1. **Primitive tokens** (`--primitive-*`) — raw color scale. Defined once in `tokens.css`, never used by components. Examples: `--primitive-gray-50` … `--primitive-gray-950`, `--primitive-pink-500`, `--primitive-blue-500`.
2. **Semantic tokens** (`--bg-*`, `--text-*`, `--border-*`, `--fill-*`, `--focus-*`) — what components consume. Map from primitives. Values change between light and dark.
3. **Component tokens** — only added when a component truly needs its own knob (rare in Phase 0). Default is for components to use semantic tokens directly.

Rule: components MUST NOT hardcode hex, `rgba()`, `bg-gray-*`, `text-white`, `bg-blue-600`, etc. Only semantic Tailwind classes generated from semantic tokens are allowed.

### 3.3 Tailwind integration

`tokens.js` exports a single object consumed by `tailwind.config.js`. The shape below is the API contract; concrete values live in §4 (color §4.1, type §4.2, radius/shadow/motion §4.3) and are the source of truth — implementation copies them verbatim. Shadow `boxShadow` values reference the light values in §4.3; dark overrides are applied in `tokens.css` under `.dark` so Tailwind doesn't need separate dark variants.

```js
export const tailwindTokens = {
  colors:                   { /* keys per §4.1, all values = var(--…) so they switch on .dark */ },
  borderRadius:             { /* per §4.3, e.g. sm: '6px', '2xl': '22px' */ },
  boxShadow:                { /* per §4.3 light values; dark via tokens.css */ },
  fontFamily:               { display: [...], text: [...], mono: [...] /* per §4.2 */ },
  fontSize:                 { /* per §4.2, e.g. body: ['17px', { lineHeight: '22px', letterSpacing: '-0.011em' }] */ },
  transitionTimingFunction: { /* per §4.3 */ },
  transitionDuration:       { /* per §4.3 */ },
};
```

Components write classes like `bg-surface text-label-primary border-separator rounded-xl shadow-1`, with autocomplete and `dark:` switching coming "for free" since the underlying CSS variable changes.

---

## 4. Token catalog

### 4.1 Color tokens (semantic)

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `bg-canvas` | `#f5f5f7` | `#000000` | `<body>` background |
| `bg-surface` | `#ffffff` | `#1c1c1e` | Card, modal, dropdown |
| `bg-surface-elevated` | `#ffffff` (+shadow-1) | `#2c2c2e` | Sticky bars, popover, navbar |
| `bg-surface-grouped` | `#ffffff` | `#1c1c1e` | iOS settings-style grouped lists |
| `fill-tertiary` | `rgba(118,118,128,.12)` | `rgba(118,118,128,.24)` | Input bg, chip bg, ghost button hover |
| `fill-quaternary` | `rgba(116,116,128,.08)` | `rgba(118,118,128,.18)` | Subtle hover |
| `text-label-primary` | `#1d1d1f` | `#f5f5f7` | Body text, headings |
| `text-label-secondary` | `rgba(60,60,67,.60)` | `rgba(235,235,245,.60)` | Subtitle, helper |
| `text-label-tertiary` | `rgba(60,60,67,.30)` | `rgba(235,235,245,.30)` | Placeholder, disabled |
| `text-label-link` | `var(--fill-accent)` | `var(--fill-accent)` | Inline link |
| `border-separator` | `rgba(60,60,67,.18)` | `rgba(84,84,88,.34)` | 1px hairline (iOS-style) |
| `border-separator-opaque` | `#d1d1d6` | `#38383a` | When solid border needed |
| `fill-accent` | `#E6007E` | `#FF2D7E` | Primary CTA, link, active state |
| `fill-accent-hover` | `#C70069` | `#FF4D8E` | Hover |
| `fill-accent-pressed` | `#A80058` | `#E61D6E` | Active/pressed |
| `fill-success` | `#34C759` | `#30D158` | Paid, success |
| `fill-warning` | `#FF9500` | `#FF9F0A` | Pending |
| `fill-danger` | `#FF3B30` | `#FF453A` | Error, refund denied, danger CTA |
| `fill-info` | `#007AFF` | `#0A84FF` | Info badge, focus |
| `focus-ring` | `rgba(0,122,255,.5)` | `rgba(10,132,255,.5)` | `box-shadow: 0 0 0 4px var(--focus-ring)` |

Color rationale: official Apple semantic palette (`#1d1d1f`, `#f5f5f7`, system grays); brand pink kept at `#E6007E` in light, lifted to `#FF2D7E` in dark for WCAG AA contrast on `#1c1c1e` surfaces; system blue `#007AFF` replaces the old cyan for focus and informational use only — it does not compete with the pink CTA.

### 4.2 Typography

```
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui
--font-text:    -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui
--font-mono:    'SF Mono', ui-monospace, Menlo, monospace
```

Type scale (lifted from Apple HIG; values in px shown as `size/line-height` with letter-spacing in em):

| Token | Size / Line-height | Letter-spacing | Use |
|---|---|---|---|
| `text-largeTitle` | 34/41 | -0.022em | Hero, event detail title |
| `text-title-1` | 28/34 | -0.020em | Page title |
| `text-title-2` | 22/28 | -0.018em | Section heading |
| `text-title-3` | 20/25 | -0.015em | Card title |
| `text-headline` | 17/22 | -0.014em (semibold 600) | List primary line |
| `text-body` | 17/22 | -0.011em | Body default |
| `text-callout` | 16/21 | -0.009em | Quote, helper |
| `text-subhead` | 15/20 | -0.006em | Form label |
| `text-footnote` | 13/18 | -0.005em | Metadata, breadcrumb |
| `text-caption-1` | 12/16 | 0 | Badge, table |
| `text-caption-2` | 11/13 | 0.005em | Tiny label |

### 4.3 Radius, shadow, motion

| Group | Tokens |
|---|---|
| Radius | `radius-sm: 6`, `radius-md: 10`, `radius-lg: 14`, `radius-xl: 18`, `radius-2xl: 22`, `radius-full: 9999`. Each one step larger than Tailwind defaults — gives an iOS feel. |
| Shadow (light) | `shadow-1: 0 1px 2px rgba(0,0,0,.04), 0 1px 1px rgba(0,0,0,.06)`<br>`shadow-2: 0 4px 12px rgba(0,0,0,.08)`<br>`shadow-popover: 0 10px 30px rgba(0,0,0,.12)` |
| Shadow (dark, override in `.dark { … }`) | `shadow-1: 0 1px 2px rgba(0,0,0,.4)`<br>`shadow-2: 0 4px 12px rgba(0,0,0,.5)`<br>`shadow-popover: 0 12px 36px rgba(0,0,0,.6)` |
| Motion duration | `duration-fast: 120ms`, `duration-base: 200ms`, `duration-slow: 320ms`, `duration-slower: 500ms` |
| Easing | `ease-standard: cubic-bezier(.4,0,.2,1)`, `ease-emphasized: cubic-bezier(.2,0,0,1)`, `ease-decelerate: cubic-bezier(0,0,.2,1)` |

### 4.4 Spacing & sizing

Keep Tailwind's default 4px-base scale; add two semantic constants:

- `--space-hairline: 0.5px` (iOS-style separator)
- `--space-touch-target: 44px` (HIG minimum tap target — used as `min-height` on `Button size="lg"`)

---

## 5. Component reskin contracts

For each primitive, the reskin is a class change only — public API (props, exports, behavior) stays identical so call sites do not need to change.

### 5.1 `Button`

- Variants: `primary` (fill-accent bg, white text), `secondary` (fill-tertiary bg, label-primary text), `ghost` (transparent, label-primary text, hover fill-quaternary), `destructive` (fill-danger bg, white text), `link` (no bg, fill-accent text, underline on hover).
- Sizes: `sm` / `md` / `lg` / `full`. `lg` and `full` use `min-h-[44px]` for touch target.
- States: hover uses `*-hover` token; pressed uses `*-pressed` and `scale-[0.98]` over `duration-fast`. Disabled is `opacity-40 cursor-not-allowed`. Loading shows the existing inline spinner (color: `border-current`).
- Focus: `focus-visible` outline using `focus-ring` token via `box-shadow`.
- Radius: `rounded-xl`.

### 5.2 `Card`, `CardHeader`, `CardBody`

- `Card`: `bg-surface`, `rounded-2xl`, `border border-separator`, `overflow-hidden`. Optional `elevated` prop adds `shadow-1`.
- `CardHeader`: `border-b border-separator`, padding `px-6 py-4`.
- `CardBody`: padding `px-6 py-4`, no extra style.

### 5.3 `Input`, `Textarea`, `Select`

- Container: stack `label` (text-subhead, label-secondary) + control + optional error message (text-footnote, fill-danger).
- Control: `bg-fill-tertiary`, no visible border at rest, `rounded-md`, `px-4 py-2.5`. Focus state replaces resting style with `box-shadow: 0 0 0 4px var(--focus-ring)`.
- Placeholder: `text-label-tertiary`.
- Error state: `box-shadow: 0 0 0 1px var(--fill-danger)` inset (instead of focus ring) plus the helper text underneath.

### 5.4 `Badge`

- Pill (`rounded-full`), `text-caption-1`, `px-2 py-0.5`.
- Variants: `default/success/warning/danger/info/admin`. Each uses `bg-fill-* / 12%` opacity background and solid `text-fill-*` text. `admin` reuses warning colors.

### 5.5 `Alert`

- `rounded-lg`, `border border-separator`, `bg-fill-* / 12%` background, `text-fill-*` solid text.
- Optional leading icon slot (uses lucide icon if provided by caller).
- Variants: `error/success/warning/info`.

### 5.6 `Spinner`

- 3 sizes (existing API), `border-current`, default text color `text-label-secondary`.

### 5.7 `ThemeToggle`

- Behavior unchanged. Class rename only: `text-label-secondary`, `hover:bg-fill-quaternary`, `rounded-xl`.

### 5.8 `LanguageSwitcher`, `UserNavigation`

- Token rename pass; no behavioral change.

### 5.9 `Navbar`

- `sticky top-0 z-50 bg-surface-elevated/85 backdrop-blur-xl border-b border-separator` — only place the design system permits `backdrop-blur`, and only at 85% opacity (Apple-style vibrancy hint, not heavy translucency).
- Brand: keep pink only on the lockup mark / accent dot. Brand text: `text-label-primary`.
- User pill: `bg-fill-tertiary text-label-primary` (gradient avatar removed; fall back to monochrome circle with initials).
- Dropdown menu: `bg-surface rounded-xl shadow-popover border border-separator`. Menu items: `text-body text-label-primary`, hover `bg-fill-quaternary`. Destructive item (Logout): `text-fill-danger`.
- Mobile: layout unchanged; only colors and radii updated.

### 5.10 `Footer`

- `bg-canvas border-t border-separator`. Text `text-label-secondary`. Links `text-label-link`. Padding consistent with Navbar.

---

## 6. Migration plan

### 6.1 Legacy class alias map

In `tailwind.config.js`, alongside the new semantic tokens, keep legacy names mapping to the new ones so existing components keep building until each is reskinned:

```js
colors: {
  ...semanticTokens,

  // Legacy aliases — DEPRECATED. Removed once all consumers migrate (Phase 1+2).
  primary:   'var(--fill-accent)',           // old pink → fill-accent
  secondary: 'var(--fill-info)',             // old cyan → system blue (semantic shift, intentional)
  navy:      'var(--bg-canvas)',             // old navy → canvas
  brand: {
    50:  'var(--fill-quaternary)',           // lightest tint
    500: 'var(--fill-accent)',
    600: 'var(--fill-accent-hover)',
    700: 'var(--fill-accent-pressed)',
  },
  dark: {
    bg:      'var(--bg-canvas)',
    surface: 'var(--bg-surface)',
    card:    'var(--bg-surface)',
    border:  'var(--border-separator)',
  },
}
```

Effect: every `bg-primary`, `bg-navy`, `dark:bg-dark-card`, etc. throughout the codebase keeps working and starts using the new theme-aware values immediately. No grep-replace required to ship Phase 0.

### 6.2 Implementation order

1. Add `frontend/src/design/{tokens.css,tokens.js,README.md}`. (Foundation only — nothing breaks because nothing consumes them yet.)
2. Wire `tailwind.config.js` to import from `tokens.js`; add legacy aliases per §6.1.
3. Trim `index.css` to `@tailwind` directives + `@import './design/tokens.css'`. Remove the old inline `:root` and `.dark` blocks.
4. Smoke test (manual) on Home, EventDetail, Login, MyTickets, Admin in both themes — at this point everything still uses legacy class names that route through aliases. Confirm no visual catastrophe.
5. Reskin primitives in this order: `Button` → `Card` → `Input/Textarea/Select` → `Badge` → `Alert` → `Spinner`. PR per primitive (or batched 2–3) — diffs stay reviewable.
6. Token rename for `ThemeToggle`, `LanguageSwitcher`, `UserNavigation`.
7. Reskin `Navbar` (largest single component in scope).
8. Reskin `Footer`.
9. Final smoke pass on the 5 pages × 2 themes = 10 screenshots, attached to the merge.
10. (Optional) Add an ESLint rule forbidding `bg-gray-*`, `text-white`, hex literals inside `frontend/src/components/`. Skip if not time.

### 6.3 Inline-style audit

Before step 5, grep for `style={` inside `frontend/src/components/` and list any components with inline color values. These bypass Tailwind and need fixing in the same pass as the class reskin.

---

## 7. Testing

- **Manual visual smoke** on 5 pages × 2 themes after step 4 and again after step 9. Capture screenshots; attach to the PR(s).
- **No automated visual regression tooling** is added in Phase 0.
- **No new unit tests** for the reskinned components — class-only changes; existing behavior tests stay.
- **WCAG spot check** with a contrast tool on three high-risk pairings: `text-label-secondary` on `bg-surface`, `fill-accent` text/CTA on dark surface, `fill-danger` badge text on its tinted background.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Alias map mistake breaks random pages | Smoke test the 5 pages immediately after step 4, before any component reskin. |
| Inline `style={{ color: '…' }}` bypasses tokens | Grep `style={` in `components/` before step 5; list and fix in the same pass. |
| Tailwind purge misses dynamically composed classes | Verify `content` glob in `tailwind.config.js` covers `./src/**/*.{js,jsx}`; spot-check production build CSS for token classes. |
| Dark-mode contrast fails WCAG AA | Spot-check the three pairings called out in §7. Adjust dark token values (only) if needed; light values are reference. |
| Pink `#E6007E` text on white fails AA at small sizes | Use it primarily as button background (white text on pink) and inline link with underline — both are WCAG-compliant. Avoid pink small-caption text on white. Documented in `design/README.md`. |

---

## 9. Open questions

None at spec-approval time. Remaining decisions are implementation-level (exact PR boundaries, optional ESLint rule timing) and belong in the implementation plan.
