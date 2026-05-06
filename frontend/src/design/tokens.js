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
    sm:    '6px',
    md:    '10px',
    lg:    '14px',
    xl:    '18px',
    '2xl': '22px',
    full:  '9999px',
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
