# Phase 0 — Apple-style Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc dark-only styling with a token-based Apple-style design system that supports light + dark correctly across primitives, Navbar, and Footer; bundles a fix for the existing light/dark sync bug.

**Architecture:** Three-tier token system (primitive → semantic → component). CSS variables defined in `frontend/src/design/tokens.css` with `:root` (light) + `.dark` (dark) overrides. Tailwind reads semantic tokens from `frontend/src/design/tokens.js` so components use classes like `bg-surface`, `text-label-primary`, `border-separator`. Legacy class names (`primary`, `secondary`, `navy`, `dark.*`) and CSS vars (`--color-*`) and utility classes (`.bg-surface`, `.text-base`, etc.) are kept as aliases pointing to new semantic tokens — nothing breaks while the team reskins component-by-component.

**Tech Stack:** React 18 + Vite + Tailwind CSS 3.4 (extend mode, CSS-vars-driven). No new dependencies. No new test framework (none exists for the frontend); verification is `npm run build` + manual smoke on 5 pages × 2 themes.

**Spec:** `docs/superpowers/specs/2026-05-06-design-system-apple-phase0-design.md`

---

## File map

**Create:**
- `frontend/src/design/tokens.css` — primitive + semantic CSS vars; light defaults in `:root`, dark overrides in `.dark`; legacy `--color-*` aliases for backwards compat
- `frontend/src/design/tokens.js` — Tailwind theme extension export (colors, radius, shadow, font, fontSize, easing, duration)
- `frontend/src/design/README.md` — token reference, usage rules, do-not list

**Modify:**
- `frontend/src/index.css` — drop old `:root` / `.dark` color blocks, keep legacy utility classes for compat, import `./design/tokens.css`
- `frontend/tailwind.config.js` — import `tokens.js`, extend theme, add legacy-name aliases
- `frontend/src/components/ui/Spinner.jsx`
- `frontend/src/components/ui/Badge.jsx`
- `frontend/src/components/ui/Alert.jsx`
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/components/ui/Input.jsx` (Input + Textarea + Select all in this file)
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/ThemeToggle.jsx`
- `frontend/src/components/ui/LanguageSwitcher.jsx`
- `frontend/src/components/ui/UserNavigation.jsx`
- `frontend/src/components/layout/Navbar.jsx`
- `frontend/src/components/Footer.jsx` (also fixes inline `style={{ backgroundColor: '#0f1117' }}` on line 48)

**Test/verify:**
- No new automated tests. After every task: `cd frontend && npm run build` must succeed.
- After Task 4 and Task 16: manual smoke on Home, EventDetail, Login, MyTickets, Admin × light/dark.

---

## Task 1: Create `frontend/src/design/tokens.css`

**Files:**
- Create: `frontend/src/design/tokens.css`

- [ ] **Step 1: Create the file with primitive + semantic vars**

```css
/* TicketRush design tokens — single source of truth.
 * Three tiers: primitives (raw values, not for direct use) → semantic (use these via Tailwind classes) → legacy aliases (deprecated, kept until Phase 2).
 * Light values live in :root; dark overrides live in .dark. Components consume these via Tailwind classes generated from src/design/tokens.js.
 */

:root {
  /* ── Primitive tokens (raw scales — do NOT reference from components) ── */

  /* Apple grays */
  --primitive-gray-50:  #f5f5f7;
  --primitive-gray-100: #ececee;
  --primitive-gray-200: #d1d1d6;
  --primitive-gray-300: #c7c7cc;
  --primitive-gray-400: #aeaeb2;
  --primitive-gray-500: #8e8e93;
  --primitive-gray-600: #636366;
  --primitive-gray-700: #48484a;
  --primitive-gray-800: #38383a;
  --primitive-gray-900: #2c2c2e;
  --primitive-gray-950: #1c1c1e;
  --primitive-black:    #000000;
  --primitive-white:    #ffffff;

  /* Brand pink */
  --primitive-pink-400: #FF2D7E;  /* dark mode accent */
  --primitive-pink-500: #E6007E;  /* canonical brand */
  --primitive-pink-600: #C70069;  /* light hover */
  --primitive-pink-700: #A80058;  /* light pressed */
  --primitive-pink-800: #FF4D8E;  /* dark hover */
  --primitive-pink-900: #E61D6E;  /* dark pressed */

  /* System status colors */
  --primitive-blue-500:   #007AFF;
  --primitive-blue-600:   #0A84FF;
  --primitive-green-500:  #34C759;
  --primitive-green-600:  #30D158;
  --primitive-orange-500: #FF9500;
  --primitive-orange-600: #FF9F0A;
  --primitive-red-500:    #FF3B30;
  --primitive-red-600:    #FF453A;

  /* ── Semantic tokens — LIGHT (default) ── */

  /* Backgrounds */
  --bg-canvas:           var(--primitive-gray-50);
  --bg-surface:          var(--primitive-white);
  --bg-surface-elevated: var(--primitive-white);
  --bg-surface-grouped:  var(--primitive-white);

  /* Fills (subtle background tints) */
  --fill-tertiary:   rgba(118,118,128,.12);
  --fill-quaternary: rgba(116,116,128,.08);

  /* Text labels */
  --text-label-primary:   #1d1d1f;
  --text-label-secondary: rgba(60,60,67,.60);
  --text-label-tertiary:  rgba(60,60,67,.30);
  --text-label-link:      var(--fill-accent);

  /* Borders */
  --border-separator:        rgba(60,60,67,.18);
  --border-separator-opaque: var(--primitive-gray-200);

  /* Accent (brand) */
  --fill-accent:         var(--primitive-pink-500);
  --fill-accent-hover:   var(--primitive-pink-600);
  --fill-accent-pressed: var(--primitive-pink-700);

  /* Status fills */
  --fill-success: var(--primitive-green-500);
  --fill-warning: var(--primitive-orange-500);
  --fill-danger:  var(--primitive-red-500);
  --fill-info:    var(--primitive-blue-500);

  /* Status tints (for badge/alert backgrounds — opacity baked in because Tailwind
     opacity modifiers don't work on var()-based color tokens) */
  --fill-success-tint: rgba(52,199,89,.15);
  --fill-warning-tint: rgba(255,149,0,.15);
  --fill-danger-tint:  rgba(255,59,48,.15);
  --fill-info-tint:    rgba(0,122,255,.15);
  --fill-accent-tint:  rgba(230,0,126,.12);

  /* Focus */
  --focus-ring:        rgba(0,122,255,.5);
  --shadow-focus:      0 0 0 4px rgba(0,122,255,.30);
  --shadow-focus-danger: 0 0 0 4px rgba(255,59,48,.30);

  /* Shadows — light */
  --shadow-1:       0 1px 2px rgba(0,0,0,.04), 0 1px 1px rgba(0,0,0,.06);
  --shadow-2:       0 4px 12px rgba(0,0,0,.08);
  --shadow-popover: 0 10px 30px rgba(0,0,0,.12);

  /* Translucent surfaces (for backdrop-blur vibrancy in Navbar) */
  --bg-surface-elevated-translucent: rgba(255,255,255,.85);

  /* ── Legacy CSS-var aliases (kept until Phase 2) ──
     Many pages still reference var(--color-*) directly via bg-[var(--color-bg)] etc. */
  --color-bg:      var(--bg-canvas);
  --color-surface: var(--bg-surface);
  --color-card:    var(--bg-surface);
  --color-border:  var(--border-separator);
  --color-text:    var(--text-label-primary);
  --color-muted:   var(--text-label-secondary);
}

.dark {
  /* Backgrounds */
  --bg-canvas:           var(--primitive-black);
  --bg-surface:          var(--primitive-gray-950);
  --bg-surface-elevated: var(--primitive-gray-900);
  --bg-surface-grouped:  var(--primitive-gray-950);

  /* Fills */
  --fill-tertiary:   rgba(118,118,128,.24);
  --fill-quaternary: rgba(118,118,128,.18);

  /* Text labels */
  --text-label-primary:   var(--primitive-gray-50);
  --text-label-secondary: rgba(235,235,245,.60);
  --text-label-tertiary:  rgba(235,235,245,.30);

  /* Borders */
  --border-separator:        rgba(84,84,88,.34);
  --border-separator-opaque: var(--primitive-gray-800);

  /* Accent — lighter in dark for AA contrast */
  --fill-accent:         var(--primitive-pink-400);
  --fill-accent-hover:   var(--primitive-pink-800);
  --fill-accent-pressed: var(--primitive-pink-900);

  /* Status fills */
  --fill-success: var(--primitive-green-600);
  --fill-warning: var(--primitive-orange-600);
  --fill-danger:  var(--primitive-red-600);
  --fill-info:    var(--primitive-blue-600);

  /* Status tints (slightly more opacity on dark for visibility) */
  --fill-success-tint: rgba(48,209,88,.20);
  --fill-warning-tint: rgba(255,159,10,.20);
  --fill-danger-tint:  rgba(255,69,58,.20);
  --fill-info-tint:    rgba(10,132,255,.20);
  --fill-accent-tint:  rgba(255,45,126,.18);

  /* Focus */
  --focus-ring:          rgba(10,132,255,.5);
  --shadow-focus:        0 0 0 4px rgba(10,132,255,.40);
  --shadow-focus-danger: 0 0 0 4px rgba(255,69,58,.40);

  /* Shadows — heavier on dark */
  --shadow-1:       0 1px 2px rgba(0,0,0,.4);
  --shadow-2:       0 4px 12px rgba(0,0,0,.5);
  --shadow-popover: 0 12px 36px rgba(0,0,0,.6);

  /* Translucent surface for navbar vibrancy */
  --bg-surface-elevated-translucent: rgba(28,28,30,.80);

  /* Legacy aliases inherit dark via cascade since they reference --bg-* / --text-* / --border-* */
}
```

- [ ] **Step 2: Verify the file is syntactically valid CSS**

Run: `cd frontend && npx postcss src/design/tokens.css -o /tmp/tokens-check.css 2>&1 || cat /tmp/tokens-check.css | head -5`

Expected: Either a successful compile or a clear PostCSS error to fix. (PostCSS may not be available standalone; skip if it errors with "command not found" — Task 4's `npm run build` will catch any syntax issue.)

- [ ] **Step 3: Stage but do NOT commit yet** (will commit with Task 4 as the foundation chunk)

```bash
git add frontend/src/design/tokens.css
```

---

## Task 2: Create `frontend/src/design/tokens.js`

**Files:**
- Create: `frontend/src/design/tokens.js`

- [ ] **Step 1: Write the Tailwind theme extension export**

```js
/* Tailwind theme extension for TicketRush design system.
 * All color values point to CSS variables defined in ./tokens.css so they switch on `.dark`.
 * Imported by frontend/tailwind.config.js. */

export const tailwindTokens = {
  colors: {
    // Backgrounds
    canvas:             'var(--bg-canvas)',
    surface:            'var(--bg-surface)',
    'surface-elevated': 'var(--bg-surface-elevated)',
    'surface-grouped':  'var(--bg-surface-grouped)',

    // Fills (semantic background tints)
    'fill-tertiary':   'var(--fill-tertiary)',
    'fill-quaternary': 'var(--fill-quaternary)',

    // Translucent variant (for navbar vibrancy)
    'surface-elevated-translucent': 'var(--bg-surface-elevated-translucent)',

    // Accent (brand pink)
    accent:           'var(--fill-accent)',
    'accent-hover':   'var(--fill-accent-hover)',
    'accent-pressed': 'var(--fill-accent-pressed)',

    // Status — solid
    success: 'var(--fill-success)',
    warning: 'var(--fill-warning)',
    danger:  'var(--fill-danger)',
    info:    'var(--fill-info)',

    // Status — tints (for badge/alert backgrounds; opacity is baked in)
    'success-tint': 'var(--fill-success-tint)',
    'warning-tint': 'var(--fill-warning-tint)',
    'danger-tint':  'var(--fill-danger-tint)',
    'info-tint':    'var(--fill-info-tint)',
    'accent-tint':  'var(--fill-accent-tint)',

    // Text labels (use as text-label-primary, etc.)
    'label-primary':   'var(--text-label-primary)',
    'label-secondary': 'var(--text-label-secondary)',
    'label-tertiary':  'var(--text-label-tertiary)',
    'label-link':      'var(--text-label-link)',

    // Borders
    separator:          'var(--border-separator)',
    'separator-opaque': 'var(--border-separator-opaque)',

    // ── Legacy aliases (deprecated — kept so existing code keeps building) ──
    primary:   'var(--fill-accent)',  // old pink → fill-accent
    secondary: 'var(--fill-info)',    // old cyan → system blue (semantic shift, intentional)
    navy:      'var(--bg-canvas)',    // old navy → canvas
    brand: {
      50:  'var(--fill-quaternary)',
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
  },

  borderRadius: {
    sm:  '6px',
    md:  '10px',
    lg:  '14px',
    xl:  '18px',
    '2xl': '22px',
    full: '9999px',
  },

  boxShadow: {
    1:              'var(--shadow-1)',
    2:              'var(--shadow-2)',
    popover:        'var(--shadow-popover)',
    focus:          'var(--shadow-focus)',
    'focus-danger': 'var(--shadow-focus-danger)',
  },

  fontFamily: {
    sans:    ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"',    'Inter', 'system-ui', 'sans-serif'],
    display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
    text:    ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"',    'Inter', 'system-ui', 'sans-serif'],
    mono:    ['"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
  },

  fontSize: {
    largeTitle:  ['34px', { lineHeight: '41px', letterSpacing: '-0.022em', fontWeight: '700' }],
    'title-1':   ['28px', { lineHeight: '34px', letterSpacing: '-0.020em', fontWeight: '700' }],
    'title-2':   ['22px', { lineHeight: '28px', letterSpacing: '-0.018em', fontWeight: '700' }],
    'title-3':   ['20px', { lineHeight: '25px', letterSpacing: '-0.015em', fontWeight: '600' }],
    headline:    ['17px', { lineHeight: '22px', letterSpacing: '-0.014em', fontWeight: '600' }],
    body:        ['17px', { lineHeight: '22px', letterSpacing: '-0.011em' }],
    callout:     ['16px', { lineHeight: '21px', letterSpacing: '-0.009em' }],
    subhead:     ['15px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
    footnote:    ['13px', { lineHeight: '18px', letterSpacing: '-0.005em' }],
    'caption-1': ['12px', { lineHeight: '16px', letterSpacing: '0' }],
    'caption-2': ['11px', { lineHeight: '13px', letterSpacing: '0.005em' }],
  },

  transitionTimingFunction: {
    standard:   'cubic-bezier(.4,0,.2,1)',
    emphasized: 'cubic-bezier(.2,0,0,1)',
    decelerate: 'cubic-bezier(0,0,.2,1)',
  },

  transitionDuration: {
    fast:   '120ms',
    base:   '200ms',
    slow:   '320ms',
    slower: '500ms',
  },
};
```

- [ ] **Step 2: Stage but do NOT commit yet**

```bash
git add frontend/src/design/tokens.js
```

---

## Task 3: Create `frontend/src/design/README.md`

**Files:**
- Create: `frontend/src/design/README.md`

- [ ] **Step 1: Write the README**

```markdown
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

`shadow-1` · `shadow-2` · `shadow-popover`. Each shadow has separate light/dark values resolved via CSS var.

## Motion

Duration: `duration-fast` (120ms) · `duration-base` (200ms) · `duration-slow` (320ms) · `duration-slower` (500ms).
Easing: `ease-standard` · `ease-emphasized` (Apple spring-like) · `ease-decelerate`.

## Adding a new token

1. Decide whether it's primitive (raw scale) or semantic (named for use case).
2. Add to `tokens.css` under the appropriate section. If semantic, also add the dark override under `.dark`.
3. If components need to reach it via Tailwind, add the key to `tokens.js` under the right group (`colors`, `borderRadius`, etc.).
4. Update this README's table.
```

- [ ] **Step 2: Stage but do NOT commit yet**

```bash
git add frontend/src/design/README.md
```

---

## Task 4: Wire `tailwind.config.js` + trim `index.css` + foundation commit

**Files:**
- Modify: `frontend/tailwind.config.js` (replace entirely)
- Modify: `frontend/src/index.css` (replace entirely)

- [ ] **Step 1: Replace `frontend/tailwind.config.js`**

```js
import { tailwindTokens } from './src/design/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors:                    tailwindTokens.colors,
      borderRadius:              tailwindTokens.borderRadius,
      boxShadow:                 tailwindTokens.boxShadow,
      fontFamily:                tailwindTokens.fontFamily,
      fontSize:                  tailwindTokens.fontSize,
      transitionTimingFunction:  tailwindTokens.transitionTimingFunction,
      transitionDuration:        tailwindTokens.transitionDuration,
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Replace `frontend/src/index.css`**

```css
@import './design/tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: var(--bg-canvas);
    color: var(--text-label-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif;
    @apply antialiased;
    transition: background-color 200ms cubic-bezier(.4,0,.2,1), color 200ms cubic-bezier(.4,0,.2,1);
  }
}

/* ── Legacy utility classes (kept until Phase 2) ──
 * Many pages reference these by name. Tailwind also generates `bg-surface`, `border-separator`, etc.
 * from the new tokens; these explicit definitions ensure the OLD class names continue working. */
.bg-surface  { background-color: var(--bg-surface); }
.bg-card     { background-color: var(--bg-surface); }
.border-base { border-color: var(--border-separator); }
.text-base   { color: var(--text-label-primary); }
.text-muted  { color: var(--text-label-secondary); }

/* Hide scrollbar for category tabs */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

> **Note on `.text-base`:** the old `index.css` redefined Tailwind's `text-base` font-size utility as a color utility. We preserve that quirk for backwards compat in Phase 0; consumers should migrate to `text-label-primary` and we can drop the override in Phase 2.

- [ ] **Step 3: Build to verify the wiring is correct**

Run: `cd frontend && npm run build 2>&1 | tail -20`
Expected: `built in <N>ms` with no error and no `[!] @tailwindcss/postcss` warning. If Tailwind errors with "Cannot find module", check `tokens.js` is at `frontend/src/design/tokens.js` and the import path in `tailwind.config.js` is exactly `./src/design/tokens.js`.

- [ ] **Step 4: Manual smoke test (5 pages × 2 themes)**

Run: `cd frontend && npm run dev` (in another terminal). Open `http://localhost:3000`. Navigate to:
1. `/` (Home)
2. `/events/<any-id>` (EventDetail) — pick any event from the home grid
3. `/login` (Login)
4. `/my-tickets` (MyTickets) — log in as `nguyen.van.a@example.com / user123` first
5. `/admin` (Admin) — log in as `admin@ticketrush.vn / admin123` first

For each, toggle theme via the moon/sun button. Confirm:
- No completely black/white voids where there shouldn't be.
- Text remains readable in both themes.
- No console errors related to CSS or unknown classes (warnings about ad-hoc classes are OK).

It is acceptable for some sub-areas to look "off" (wrong gray tone, mismatched border) — they will be reskinned in Tasks 5–15. We are checking for **catastrophic breakage** only at this point. Stop the dev server when done.

- [ ] **Step 5: Commit the foundation**

```bash
git add frontend/src/design/tokens.css frontend/src/design/tokens.js frontend/src/design/README.md frontend/tailwind.config.js frontend/src/index.css
git commit -m "$(cat <<'EOF'
feat(design): introduce token-based design system foundation

Three-tier token system in frontend/src/design/. Tailwind extends
from tokens.js so components can use semantic classes like bg-surface,
text-label-primary, border-separator. Legacy class names and CSS vars
aliased so existing code keeps building during the per-component
reskin in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Reskin `Spinner`

**Files:**
- Modify: `frontend/src/components/ui/Spinner.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-4', lg: 'w-16 h-16 border-4' }[size];
  return (
    <div className={`${sz} border-accent border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <Spinner size="lg" />
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Spinner.jsx
git commit -m "refactor(ui): reskin Spinner with semantic tokens"
```

---

## Task 6: Reskin `Badge`

**Files:**
- Modify: `frontend/src/components/ui/Badge.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
const VARIANT_CLS = {
  default:  'bg-fill-tertiary text-label-primary',
  success:  'bg-success-tint text-success',
  warning:  'bg-warning-tint text-warning',
  danger:   'bg-danger-tint  text-danger',
  info:     'bg-info-tint    text-info',
  admin:    'bg-warning-tint text-warning',
};

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`inline-flex items-center text-caption-1 font-medium px-2 py-0.5 rounded-full ${VARIANT_CLS[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Badge.jsx
git commit -m "refactor(ui): reskin Badge with semantic tokens"
```

---

## Task 7: Reskin `Alert`

**Files:**
- Modify: `frontend/src/components/ui/Alert.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
const STYLES = {
  error:   'bg-danger-tint  border-danger  text-danger',
  success: 'bg-success-tint border-success text-success',
  warning: 'bg-warning-tint border-warning text-warning',
  info:    'bg-info-tint    border-info    text-info',
};

export function Alert({ type = 'error', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`border rounded-lg px-4 py-3 text-footnote ${STYLES[type]} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Alert.jsx
git commit -m "refactor(ui): reskin Alert with semantic tokens"
```

---

## Task 8: Reskin `Card`

**Files:**
- Modify: `frontend/src/components/ui/Card.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
export function Card({ className = '', elevated = false, children }) {
  const shadow = elevated ? 'shadow-1' : '';
  return (
    <div className={`bg-surface rounded-2xl border border-separator overflow-hidden ${shadow} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return <div className={`px-6 py-4 border-b border-separator ${className}`}>{children}</div>;
}

export function CardBody({ className = '', children }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Card.jsx
git commit -m "refactor(ui): reskin Card with semantic tokens, add elevated prop"
```

---

## Task 9: Reskin `Input`, `Textarea`, `Select`

**Files:**
- Modify: `frontend/src/components/ui/Input.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
const baseControl =
  'w-full bg-fill-tertiary rounded-md px-4 py-2.5 text-body text-label-primary placeholder-label-tertiary ' +
  'border border-transparent ' +
  'focus:outline-none focus:border-info focus:shadow-focus ' +
  'transition-[box-shadow,border-color] duration-fast ease-standard';

const errorControl = 'border-danger focus:border-danger focus:shadow-focus-danger';

function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-subhead text-label-secondary mb-1">{label}</label>}
      {children}
      {error && <p className="text-footnote text-danger mt-1">{error}</p>}
    </div>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <input
        {...props}
        className={`${baseControl} ${error ? errorControl : ''} ${className}`}
      />
    </Field>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <textarea
        {...props}
        className={`${baseControl} resize-none ${error ? errorControl : ''} ${className}`}
      />
    </Field>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <Field label={label} error={error}>
      <select
        {...props}
        className={`${baseControl} ${error ? errorControl : ''} ${className}`}
      >
        {children}
      </select>
    </Field>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Input.jsx
git commit -m "refactor(ui): reskin Input/Textarea/Select with semantic tokens"
```

---

## Task 10: Reskin `Button`

**Files:**
- Modify: `frontend/src/components/ui/Button.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
const VARIANTS = {
  primary:     'bg-accent hover:bg-accent-hover active:bg-accent-pressed text-white border border-transparent',
  secondary:   'bg-fill-tertiary hover:bg-fill-quaternary text-label-primary border border-transparent',
  ghost:       'bg-transparent hover:bg-fill-quaternary text-label-primary border border-transparent',
  destructive: 'bg-danger hover:bg-danger active:bg-danger text-white border border-transparent',
  link:        'bg-transparent text-accent hover:underline border border-transparent px-0 py-0',
};

const SIZES = {
  sm:   'px-3 py-1.5 text-footnote',
  md:   'px-5 py-2.5 text-subhead font-medium',
  lg:   'px-6 py-3   text-body    font-semibold min-h-[44px]',
  full: 'px-6 py-3   text-body    font-semibold min-h-[44px] w-full',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl
        transition-[transform,background-color,color] duration-fast ease-standard
        active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:shadow-focus
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Button.jsx
git commit -m "refactor(ui): reskin Button with semantic tokens, 5 variants, press scale"
```

---

## Task 11: Reskin `ThemeToggle`

**Files:**
- Modify: `frontend/src/components/ui/ThemeToggle.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl
                  text-label-secondary
                  hover:bg-fill-quaternary
                  transition-colors duration-fast ease-standard ${className}`}
    >
      {/* Sun — visible in dark mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={`w-5 h-5 absolute transition-all duration-base
                    ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}`}
      >
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>

      {/* Moon — visible in light mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={`w-5 h-5 absolute transition-all duration-base
                    ${isDark ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/ThemeToggle.jsx
git commit -m "refactor(ui): reskin ThemeToggle with semantic tokens"
```

---

## Task 12: Reskin `LanguageSwitcher`

**Files:**
- Modify: `frontend/src/components/ui/LanguageSwitcher.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'vi', label: 'VN', flag: '🇻🇳', full: 'Tiếng Việt (VN)' },
  { code: 'en', label: 'EN', flag: '🇬🇧', full: 'English (EN)' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGS.find(l => l.code === (i18n.language?.slice(0, 2))) || LANGS[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-separator bg-surface text-subhead font-semibold text-label-primary hover:bg-fill-quaternary transition-colors duration-fast ease-standard shadow-1"
      >
        <span>{current.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-label-tertiary transition-transform duration-fast ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-separator bg-surface py-1.5 shadow-popover overflow-hidden">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-subhead text-left text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
            >
              <span className="flex-1">{lang.full}</span>
              {current.code === lang.code && (
                <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/LanguageSwitcher.jsx
git commit -m "refactor(ui): reskin LanguageSwitcher with semantic tokens"
```

---

## Task 13: Reskin `UserNavigation`

**Files:**
- Modify: `frontend/src/components/ui/UserNavigation.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

/** UserNavigation — Bell + Avatar cluster for the header. */
export default function UserNavigation({ hasNotification = true }) {
  const { t }            = useTranslation();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    setNotifOpen(v => !v);
    setMenuOpen(false);
  };

  const handleAvatarClick = () => {
    setMenuOpen(v => !v);
    setNotifOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-2.5">

      {/* Bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={handleBellClick}
          aria-label="Thông báo"
          className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
                     bg-fill-tertiary hover:bg-fill-quaternary
                     text-label-secondary
                     transition-colors duration-fast ease-standard"
        >
          <Bell size={18} strokeWidth={2} />
          {hasNotification && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger
                             border-2 border-surface" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2.5 z-50 w-72
                          rounded-xl border border-separator bg-surface
                          shadow-popover overflow-hidden">
            <div className="px-4 py-3 border-b border-separator">
              <p className="text-subhead font-semibold text-label-primary">Thông báo</p>
            </div>
            <div className="px-4 py-8 text-center text-footnote text-label-tertiary">
              Không có thông báo mới
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleAvatarClick}
          aria-label="Tài khoản"
          className="relative cursor-pointer group outline-none"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden
                          ring-2 ring-surface
                          bg-fill-tertiary
                          shadow-1
                          flex items-center justify-center
                          transition-transform duration-fast ease-standard group-hover:scale-[1.06]">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-label-tertiary translate-y-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4
                         7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6
                         4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            )}
          </div>

          {hasNotification && (
            <span className="absolute -top-0.5 -right-0.5 z-10
                             w-[13px] h-[13px] rounded-full bg-danger
                             border-2 border-surface
                             shadow-1" />
          )}

          <span className="absolute -bottom-1 -right-1 z-10
                           w-[18px] h-[18px] rounded-full
                           bg-surface
                           border border-separator
                           shadow-1
                           flex items-center justify-center">
            <ChevronDown
              size={9}
              strokeWidth={3}
              className={`text-label-secondary transition-transform duration-fast ${menuOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-3 z-50 w-52
                          rounded-xl border border-separator bg-surface py-1.5
                          shadow-popover overflow-hidden">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.profile')}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.faq')}
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-subhead text-warning hover:bg-fill-quaternary transition-colors duration-fast"
              >
                {t('nav.admin')}
              </Link>
            )}
            <div className="border-t border-separator my-1" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 text-subhead text-danger hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/UserNavigation.jsx
git commit -m "refactor(ui): reskin UserNavigation with semantic tokens"
```

---

## Task 14: Reskin `Navbar`

**Files:**
- Modify: `frontend/src/components/layout/Navbar.jsx` (replace entirely)

- [ ] **Step 1: Replace the file**

```jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const menuRef          = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 bg-surface-elevated-translucent backdrop-blur-xl border-b border-separator
                    px-4 sm:px-6 py-3 flex items-center justify-between
                    transition-colors duration-fast">
      {/* Brand */}
      <Link
        to="/"
        className="text-title-3 font-bold text-label-primary flex items-center gap-2 hover:text-accent transition-colors duration-fast"
      >
        <span className="text-2xl">🎫</span>
        <span>TicketRush</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3 text-subhead">
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:block text-warning hover:opacity-80 font-medium transition-opacity duration-fast"
              >
                Admin
              </Link>
            )}

            <Link
              to="/my-tickets"
              className="hidden sm:block text-label-secondary hover:text-label-primary transition-colors duration-fast"
            >
              Vé của tôi
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 bg-fill-tertiary hover:bg-fill-quaternary border border-separator rounded-xl px-3 py-1.5 transition-colors duration-fast"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <span className="w-6 h-6 rounded-full bg-fill-quaternary flex items-center justify-center text-caption-1 font-bold text-label-primary flex-shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:block text-label-primary max-w-[100px] truncate">
                  {user.full_name}
                </span>
                <span className="text-label-tertiary text-caption-2">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-surface border border-separator rounded-xl shadow-popover overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-separator">
                    <p className="font-semibold text-subhead text-label-primary truncate">{user.full_name}</p>
                    <p className="text-footnote text-label-tertiary truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
                  >
                    Tài khoản
                  </Link>

                  <Link
                    to="/my-tickets"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast sm:hidden"
                  >
                    Vé của tôi
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-subhead text-warning hover:bg-fill-quaternary transition-colors duration-fast sm:hidden"
                    >
                      Admin
                    </Link>
                  )}

                  <div className="border-t border-separator" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-subhead text-danger hover:bg-fill-quaternary transition-colors duration-fast"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-label-secondary hover:text-label-primary transition-colors duration-fast"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg font-medium transition-colors duration-fast"
            >
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Navbar.jsx
git commit -m "refactor(layout): reskin Navbar with semantic tokens, vibrancy, monochrome avatar"
```

---

## Task 15: Reskin `Footer` (also fixes inline-style bug on line 48)

**Files:**
- Read first to confirm current shape: `frontend/src/components/Footer.jsx`
- Modify: `frontend/src/components/Footer.jsx`

- [ ] **Step 1: Read the full file**

Use the Read tool on `frontend/src/components/Footer.jsx`. The class changes below are mechanical — locate each occurrence and replace.

- [ ] **Step 2: Apply replacements**

Replace the `FooterLink` className:

Old:
```jsx
className="block text-sm text-gray-400 hover:text-white transition leading-relaxed"
```

New (apply to BOTH the `<a>` and the `<Link>` returns inside `FooterLink`):
```jsx
className="block text-footnote text-label-secondary hover:text-label-primary transition-colors duration-fast leading-relaxed"
```

Replace the `<footer>` tag's inline style + class. Find:
```jsx
<footer style={{ backgroundColor: '#0f1117' }}
```

Replace with:
```jsx
<footer className="bg-canvas border-t border-separator"
```

Then merge any existing className on the `<footer>` element into the new class string. (The current file has only the inline style on the opening `<footer>` tag.)

For ANY remaining `text-gray-400`, `text-white`, `text-gray-300`, `bg-gray-*` classes inside Footer.jsx, swap them per this map:
- `text-gray-400` → `text-label-secondary`
- `text-gray-300` → `text-label-secondary`
- `text-white`    → `text-label-primary`
- `bg-gray-900`   → `bg-surface`
- `bg-gray-800`   → `bg-fill-tertiary`
- `border-gray-700` / `border-gray-800` → `border-separator`

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: success.

- [ ] **Step 4: Quick visual smoke on Home page**

Run: `cd frontend && npm run dev` then open `http://localhost:3000`. Scroll to footer in both light and dark — confirm the footer changes color with the theme (was previously stuck at `#0f1117`). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Footer.jsx
git commit -m "refactor(layout): reskin Footer with semantic tokens, drop hardcoded backgroundColor"
```

---

## Task 16: Final smoke test + screenshot capture

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Smoke test 5 pages × 2 themes**

Open `http://localhost:3000`. For EACH of the following 5 pages, toggle theme via the moon/sun button and verify:

| Page | URL | Verify |
|---|---|---|
| Home | `/` | Navbar + Footer + event cards switch themes; primary CTAs are pink (no cyan visible). |
| EventDetail | `/events/<id>` | Page chrome switches; SeatMap area may look "off" — that's Phase 1, OK. |
| Login | `/login` | Form inputs use fill-tertiary background; button is pink. |
| MyTickets | `/my-tickets` (login as `nguyen.van.a@example.com / user123`) | Cards + badges switch correctly. |
| Admin | `/admin` (login as `admin@ticketrush.vn / admin123`) | Page chrome switches; deep admin internals may look "off" — that's Phase 2, OK. |

For each combination, also confirm:
- No console errors related to CSS or unknown Tailwind classes.
- No element completely stuck in the wrong theme (e.g., black square on light page).
- Pink (`#E6007E` light / `#FF2D7E` dark) is the only chromatic accent visible on chrome elements; the old cyan `#00AEEF` is gone from Navbar/Footer/primitive components.

- [ ] **Step 3: Capture screenshots**

For each of the 5 pages × 2 themes (10 total), use the OS screenshot tool (macOS: ⌘⇧4) to capture each. Save into `frontend/docs/phase0-smoke/` named `<page>-<theme>.png` (e.g., `home-light.png`, `home-dark.png`).

```bash
mkdir -p frontend/docs/phase0-smoke
# Save screenshots manually into this directory
```

- [ ] **Step 4: Stop dev server**

Use Ctrl+C in the dev-server terminal.

- [ ] **Step 5: Commit screenshots**

```bash
git add frontend/docs/phase0-smoke/
git commit -m "docs(design): Phase 0 smoke screenshots — 5 pages × 2 themes"
```

If you cannot capture screenshots in your environment, note this in the commit message and describe what you verified instead:

```bash
git commit --allow-empty -m "test(design): Phase 0 manual smoke verified — 5 pages × 2 themes (no screenshot environment)"
```

- [ ] **Step 6: Update `MEMORY.md` to record Phase 0 completion**

Append (or create a new memory file under `~/.claude/projects/-Users-macbook-Desktop-Projects-UET-TicketRush/memory/` for the project state):

This is a project-state memory; create `project_design_system_phase0.md` under the memory directory and link from `MEMORY.md`. Use this content:

```markdown
---
name: Design System Phase 0 complete
description: Token-based Apple-style design system landed; primitives + Navbar/Footer reskinned; light/dark sync bug fixed
type: project
---

Phase 0 of the 6-part UI initiative is shipped on `main`.

**Why:** Foundation for Phases 1+ (Seat Designer, Event-show polish, Animations, News). The pre-Phase-0 light/dark toggle was visually broken — primitive components hardcoded dark colors and ignored the .dark class.

**How to apply:**
- New UI MUST use semantic Tailwind classes (bg-surface, text-label-primary, border-separator, bg-accent, text-danger, rounded-xl, shadow-1) — see frontend/src/design/README.md.
- Legacy classes (bg-primary, bg-navy, dark:bg-dark-card) and CSS vars (var(--color-*)) are aliased and still work, but DO NOT use them in new code.
- Brand color is the single accent: pink #E6007E light / #FF2D7E dark. Cyan is removed.
- Phases 1+ can drop legacy aliases once their pages no longer reference them.
```

```bash
# Then append the link to MEMORY.md (don't overwrite the existing entries)
```

---

## Self-review checklist (the implementer's task)

After all tasks above are done, before declaring Phase 0 complete:

- [ ] `git log` shows ~12 commits since the spec (1 foundation + 11 component reskins + 1 smoke). No squashing — keep the per-component history for reviewability.
- [ ] `npm run build` is green.
- [ ] All 9 success criteria from the spec §1.1 are satisfied. List each and confirm.
- [ ] No new TODO/FIXME comments introduced in the reskinned files.
- [ ] `frontend/src/design/README.md` is up to date with anything you changed.

---

## Notes for implementer

- **No automated tests are added** for this work — class-only refactors don't change behavior, and the frontend has no existing test framework. Verification is `npm run build` + manual smoke.
- **Per-component commits intentionally** — they make code review tractable and let you bisect any visual regression.
- **If a build fails mid-task**, fix and re-run before committing. Do not commit a broken build.
- **If you discover a Tailwind class name you used isn't generating** (e.g., `bg-fill-tertiary` doesn't apply), check `tokens.js` — the class name MUST exist as a key under the right `colors` / etc. group.
- **Inline-style audit was already run** and only found `Footer.jsx:48`. If you find another while reskinning, fix it inline and mention it in the commit message.
- **`text-base` is overloaded** in `index.css` to mean "text color = primary" (legacy). When you see `text-base` in pages, leave it alone in Phase 0 — it works via the legacy utility class. Phase 2 will migrate consumers to `text-label-primary` and drop the override.
